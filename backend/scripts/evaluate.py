from __future__ import annotations

import argparse

from goa_rag.config import Settings
from goa_rag.dataset import resolve_dataset_revision, stream_evaluation_records
from goa_rag.embeddings import HybridEmbedder
from goa_rag.qdrant_store import QdrantStore
from goa_rag.retriever import HybridRetriever


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--language", default="gu")
    parser.add_argument("--split", default="validation", choices=["validation", "train"])
    parser.add_argument("--records", type=int, default=100)
    args = parser.parse_args()

    settings = Settings()
    revision = resolve_dataset_revision(settings.msmarco_dataset, settings.msmarco_revision)
    embedder = HybridEmbedder(settings.dense_model, settings.sparse_model)
    store = QdrantStore(settings)
    retriever = HybridRetriever(settings, embedder, store)

    hits_at_5 = 0
    reciprocal_sum = 0.0
    evaluated = 0
    for record in stream_evaluation_records(
        settings.msmarco_dataset,
        args.language,
        args.split,
        args.records,
        revision,
        parquet_batch_size=settings.parquet_batch_size,
    ):
        relevant_passages = {
            index for index, selected in enumerate(record.selected) if selected == 1
        }
        if not relevant_passages:
            continue
        results = retriever.search(record.query, language=args.language, split=args.split, limit=10)
        ranked = [
            int((point.payload or {}).get("passage_index", -1))
            for point in results
            if int((point.payload or {}).get("query_id", -1)) == record.query_id
        ]
        evaluated += 1
        if any(index in relevant_passages for index in ranked[:5]):
            hits_at_5 += 1
        for rank, passage_index in enumerate(ranked[:10], start=1):
            if passage_index in relevant_passages:
                reciprocal_sum += 1.0 / rank
                break

    if not evaluated:
        raise SystemExit("No evaluable records with relevance labels were found.")
    print(f"Evaluated: {evaluated}")
    print(f"Recall@5: {hits_at_5 / evaluated:.4f}")
    print(f"MRR@10: {reciprocal_sum / evaluated:.4f}")


if __name__ == "__main__":
    main()
