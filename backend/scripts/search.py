from __future__ import annotations

import argparse

from goa_rag.config import Settings
from goa_rag.embeddings import HybridEmbedder
from goa_rag.qdrant_store import QdrantStore
from goa_rag.retriever import HybridRetriever


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("query")
    parser.add_argument("--language")
    parser.add_argument("--split")
    parser.add_argument("--limit", type=int, default=5)
    args = parser.parse_args()

    settings = Settings()
    embedder = HybridEmbedder(settings.dense_model, settings.sparse_model)
    store = QdrantStore(settings)
    retriever = HybridRetriever(settings, embedder, store)
    points = retriever.search(args.query, language=args.language, split=args.split, limit=args.limit)
    for rank, point in enumerate(points, start=1):
        payload = point.payload or {}
        print(f"#{rank} score={point.score:.6f} lang={payload.get('language')} strategy={payload.get('chunk_strategy')}")
        print(str(payload.get("text", ""))[:500])
        print()


if __name__ == "__main__":
    main()
