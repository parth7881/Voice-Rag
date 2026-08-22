from __future__ import annotations

import time
from collections.abc import Sequence

from qdrant_client import QdrantClient, models
from qdrant_client.http.exceptions import (
    ResponseHandlingException,
    UnexpectedResponse,
)

from .config import Settings
from .models import Chunk


class QdrantStore:
    UPSERT_BATCH_SIZE = 8
    MAX_UPSERT_ATTEMPTS = 6
    TRANSIENT_STATUS_CODES = {408, 429, 500, 502, 503, 504}

    def __init__(self, settings: Settings) -> None:
        settings.require_qdrant()

        kwargs = {
            "url": settings.qdrant_url,
            "timeout": 60,
        }

        if settings.qdrant_api_key:
            kwargs["api_key"] = settings.qdrant_api_key

        self.client = QdrantClient(**kwargs)
        self.settings = settings

    def ensure_collection(self, *, recreate: bool = False) -> None:
        name = self.settings.qdrant_collection
        exists = self.client.collection_exists(name)

        if recreate and exists:
            self.client.delete_collection(name)
            exists = False

        if not exists:
            self.client.create_collection(
                collection_name=name,
                vectors_config={
                    self.settings.dense_vector_name: models.VectorParams(
                        size=384,
                        distance=models.Distance.COSINE,
                        on_disk=False,
                    )
                },
                sparse_vectors_config={
                    self.settings.sparse_vector_name: models.SparseVectorParams(
                        index=models.SparseIndexParams(on_disk=False),
                        modifier=models.Modifier.IDF,
                    )
                },
                on_disk_payload=True,
            )

            for field in (
                "language",
                "split",
                "query_type",
                "dataset_revision",
                "parent_id",
            ):
                self.client.create_payload_index(
                    collection_name=name,
                    field_name=field,
                    field_schema=models.PayloadSchemaType.KEYWORD,
                    wait=True,
                )

    def count(self) -> int:
        return int(
            self.client.count(
                self.settings.qdrant_collection,
                exact=True,
            ).count
        )

    def _upsert_with_retry(
        self,
        points: Sequence[models.PointStruct],
    ) -> None:
        for attempt in range(1, self.MAX_UPSERT_ATTEMPTS + 1):
            try:
                self.client.upsert(
                    collection_name=self.settings.qdrant_collection,
                    points=list(points),
                    wait=True,
                )
                return

            except UnexpectedResponse as exc:
                transient = exc.status_code in self.TRANSIENT_STATUS_CODES

                if not transient or attempt == self.MAX_UPSERT_ATTEMPTS:
                    raise

                delay = min(2 ** (attempt - 1), 16)

                print(
                    f"\n[Qdrant] HTTP {exc.status_code}; "
                    f"retry {attempt}/{self.MAX_UPSERT_ATTEMPTS} "
                    f"in {delay}s..."
                )

                time.sleep(delay)

            except ResponseHandlingException:
                if attempt == self.MAX_UPSERT_ATTEMPTS:
                    raise

                delay = min(2 ** (attempt - 1), 16)

                print(
                    f"\n[Qdrant] network/timeout error; "
                    f"retry {attempt}/{self.MAX_UPSERT_ATTEMPTS} "
                    f"in {delay}s..."
                )

                time.sleep(delay)

    def upsert(
        self,
        chunks: Sequence[Chunk],
        dense_vectors: Sequence[Sequence[float]],
        sparse_vectors: Sequence,
    ) -> None:
        points: list[models.PointStruct] = []

        for chunk, dense, sparse in zip(
            chunks,
            dense_vectors,
            sparse_vectors,
            strict=True,
        ):
            points.append(
                models.PointStruct(
                    id=chunk.id,
                    vector={
                        self.settings.dense_vector_name: list(dense),
                        self.settings.sparse_vector_name: models.SparseVector(
                            indices=[
                                int(value)
                                for value in sparse.indices.tolist()
                            ],
                            values=[
                                float(value)
                                for value in sparse.values.tolist()
                            ],
                        ),
                    },
                    payload=chunk.payload(),
                )
            )

        for start in range(0, len(points), self.UPSERT_BATCH_SIZE):
            micro_batch = points[
                start : start + self.UPSERT_BATCH_SIZE
            ]

            self._upsert_with_retry(micro_batch)