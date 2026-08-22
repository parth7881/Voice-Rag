from __future__ import annotations

import argparse
from itertools import islice
from pathlib import Path

from goa_rag.chunking import chunk_records
from goa_rag.config import PROJECT_ROOT, Settings
from goa_rag.dataset import SUPPORTED_LANGUAGES, resolve_dataset_revision, stream_records
from goa_rag.embeddings import HybridEmbedder
from goa_rag.manifest import IndexManifest
from goa_rag.qdrant_store import QdrantStore


def batched(iterator, size: int):
    while batch := list(islice(iterator, size)):
        yield batch


def main() -> None:
    parser = argparse.ArgumentParser(description="Memory-bounded MSMARCO-XI hybrid indexer")
    parser.add_argument("--languages", nargs="+", default=["gu", "hi"])
    parser.add_argument("--split", choices=["train", "validation"], default="validation")
    parser.add_argument("--records-per-language", type=int, default=1000)
    parser.add_argument("--start-record", type=int, default=0)
    parser.add_argument("--recreate", action="store_true")
    parser.add_argument("--resume", action="store_true")
    args = parser.parse_args()

    unknown = sorted(set(args.languages) - SUPPORTED_LANGUAGES)
    if unknown:
        raise SystemExit(f"Unsupported language(s): {', '.join(unknown)}")
    if args.recreate and args.resume:
        raise SystemExit("Use either --recreate or --resume, not both.")

    settings = Settings()
    settings.require_qdrant()
    revision = resolve_dataset_revision(settings.msmarco_dataset, settings.msmarco_revision)
    store = QdrantStore(settings)
    store.ensure_collection(recreate=args.recreate)
    existing = store.count()
    if existing and not args.recreate and not args.resume:
        raise SystemExit(
            f"Collection already contains {existing} points. Use --resume or --recreate explicitly."
        )

    print(f"Dataset revision: {revision}")
    print(f"Collection: {settings.qdrant_collection}")
    print("Loading ONNX dense + sparse embedding models...")
    embedder = HybridEmbedder(settings.dense_model, settings.sparse_model)

    written = 0
    for language in args.languages:
        records = stream_records(
            settings.msmarco_dataset,
            language,
            args.split,
            args.records_per_language,
            revision,
            start=args.start_record,
            parquet_batch_size=settings.parquet_batch_size,
        )
        chunks = chunk_records(records, language=language, split=args.split, dataset_revision=revision)
        language_written = 0
        for batch in batched(chunks, settings.index_batch_size):
            texts = [chunk.text for chunk in batch]
            dense = embedder.dense_passages(texts)
            sparse = embedder.sparse_documents(texts)
            store.upsert(batch, dense, sparse)
            written += len(batch)
            language_written += len(batch)
            print(f"[{language}] indexed chunks: {language_written}", end="\r", flush=True)
        print(f"[{language}] indexed chunks: {language_written}")

    manifest = IndexManifest.create(
        dataset=settings.msmarco_dataset,
        revision=revision,
        split=args.split,
        languages=list(args.languages),
        records_per_language=args.records_per_language,
        collection=settings.qdrant_collection,
        dense_model=settings.dense_model,
        sparse_model=settings.sparse_model,
        chunks_written=written,
    )
    manifest_path = Path(PROJECT_ROOT) / "backend" / "artifacts" / "index-manifest.json"
    manifest.write(manifest_path)
    print(f"INDEX COMPLETE — {written} chunks written")
    print(f"Manifest: {manifest_path}")


if __name__ == "__main__":
    main()
