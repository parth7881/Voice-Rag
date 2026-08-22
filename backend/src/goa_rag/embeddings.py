from __future__ import annotations

from collections.abc import Iterable

import numpy as np
from fastembed import SparseTextEmbedding, TextEmbedding
from fastembed.common.model_description import ModelSource, PoolingType


class HybridEmbedder:
    """Memory-bounded multilingual dense + BM25 sparse embeddings."""

    DENSE_DIM = 384
    DENSE_BATCH_SIZE = 8
    SPARSE_BATCH_SIZE = 64

    def __init__(self, dense_model: str, sparse_model: str) -> None:
        if dense_model == "intfloat/multilingual-e5-small":
            try:
                TextEmbedding.add_custom_model(
                    model=dense_model,
                    pooling=PoolingType.MEAN,
                    normalization=True,
                    sources=ModelSource(hf=dense_model),
                    dim=self.DENSE_DIM,
                    model_file="onnx/model_O4.onnx",
                )
            except ValueError:
                # Already registered or natively available.
                pass

        self._dense = TextEmbedding(
            model_name=dense_model,
            threads=2,
        )

        self._sparse = SparseTextEmbedding(
            model_name=sparse_model,
        )

    def dense_passages(self, texts: Iterable[str]) -> list[list[float]]:
        prepared = [f"passage: {text}" for text in texts]

        return [
            np.asarray(vector, dtype=np.float32).tolist()
            for vector in self._dense.embed(
                prepared,
                batch_size=self.DENSE_BATCH_SIZE,
                parallel=None,
            )
        ]

    def dense_query(self, text: str) -> list[float]:
        vector = next(
            iter(
                self._dense.embed(
                    [f"query: {text}"],
                    batch_size=1,
                    parallel=None,
                )
            )
        )

        return np.asarray(vector, dtype=np.float32).tolist()

    def sparse_documents(self, texts: Iterable[str]):
        prepared = list(texts)

        return list(
            self._sparse.embed(
                prepared,
                batch_size=self.SPARSE_BATCH_SIZE,
                parallel=None,
            )
        )

    def sparse_query(self, text: str):
        return next(
            iter(
                self._sparse.embed(
                    [text],
                    batch_size=1,
                    parallel=None,
                )
            )
        )