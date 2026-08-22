from __future__ import annotations

import time

from qdrant_client import models

from .config import Settings
from .embeddings import HybridEmbedder
from .qdrant_store import QdrantStore


class HybridRetriever:
    def __init__(
        self,
        settings: Settings,
        embedder: HybridEmbedder,
        store: QdrantStore,
    ) -> None:
        self.settings = settings
        self.embedder = embedder
        self.store = store

    def search(
        self,
        query: str,
        *,
        language: str | None = None,
        split: str | None = None,
        limit: int = 5,
    ):
        dense_start = time.perf_counter()

        dense = self.embedder.dense_query(
            query
        )

        dense_end = time.perf_counter()


        sparse_start = time.perf_counter()

        sparse = self.embedder.sparse_query(
            query
        )

        sparse_end = time.perf_counter()


        must: list[
            models.FieldCondition
        ] = []

        if language:
            must.append(
                models.FieldCondition(
                    key="language",
                    match=models.MatchValue(
                        value=language
                    ),
                )
            )

        if split:
            must.append(
                models.FieldCondition(
                    key="split",
                    match=models.MatchValue(
                        value=split
                    ),
                )
            )

        query_filter = (
            models.Filter(
                must=must
            )
            if must
            else None
        )


        qdrant_start = time.perf_counter()

        response = (
            self.store.client.query_points(
                collection_name=(
                    self.settings.qdrant_collection
                ),
                prefetch=[
                    models.Prefetch(
                        query=dense,
                        using=(
                            self.settings
                            .dense_vector_name
                        ),
                        limit=max(
                            20,
                            limit * 4,
                        ),
                    ),
                    models.Prefetch(
                        query=models.SparseVector(
                            indices=[
                                int(value)
                                for value
                                in sparse.indices.tolist()
                            ],
                            values=[
                                float(value)
                                for value
                                in sparse.values.tolist()
                            ],
                        ),
                        using=(
                            self.settings
                            .sparse_vector_name
                        ),
                        limit=max(
                            8,
                            limit * 2,
                        ),
                    ),
                ],
                query=models.FusionQuery(
                    fusion=models.Fusion.RRF
                ),
                query_filter=query_filter,
                with_payload=[
                    "text",
                    "language",
                    "chunk_strategy",
                    "query_id",
                ],
                limit=limit,
            )
        )

        qdrant_end = time.perf_counter()


        dense_ms = (
            dense_end
            - dense_start
        ) * 1000

        sparse_ms = (
            sparse_end
            - sparse_start
        ) * 1000

        qdrant_ms = (
            qdrant_end
            - qdrant_start
        ) * 1000

        total_ms = (
            qdrant_end
            - dense_start
        ) * 1000


        print(
            "[retrieval] "
            f"dense={dense_ms:.2f}ms | "
            f"sparse={sparse_ms:.2f}ms | "
            f"qdrant={qdrant_ms:.2f}ms | "
            f"total={total_ms:.2f}ms"
        )

        return response.points