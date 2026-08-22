from __future__ import annotations

from dataclasses import dataclass
from typing import Any


@dataclass(frozen=True, slots=True)
class DatasetRecord:
    query: str
    query_id: int
    query_type: str
    passages: tuple[str, ...]


@dataclass(frozen=True, slots=True)
class EvaluationRecord:
    query: str
    query_id: int
    query_type: str
    passages: tuple[str, ...]
    selected: tuple[int, ...]


@dataclass(frozen=True, slots=True)
class Chunk:
    id: str
    text: str
    language: str
    split: str
    query_id: int
    query_type: str
    passage_index: int
    parent_id: str
    chunk_index: int
    strategy: str
    token_count: int
    dataset_revision: str
    content_hash: str

    def payload(self) -> dict[str, Any]:
        return {
            "text": self.text,
            "language": self.language,
            "split": self.split,
            "query_id": self.query_id,
            "query_type": self.query_type,
            "passage_index": self.passage_index,
            "parent_id": self.parent_id,
            "chunk_index": self.chunk_index,
            "chunk_strategy": self.strategy,
            "token_count": self.token_count,
            "dataset_revision": self.dataset_revision,
            "content_hash": self.content_hash,
            "source": "ai4bharat/MSMARCO-XI",
        }
