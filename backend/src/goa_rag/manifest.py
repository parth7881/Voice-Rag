from __future__ import annotations

import json
from dataclasses import asdict, dataclass
from datetime import UTC, datetime
from pathlib import Path


@dataclass(slots=True)
class IndexManifest:
    dataset: str
    revision: str
    split: str
    languages: list[str]
    records_per_language: int
    collection: str
    dense_model: str
    sparse_model: str
    chunks_written: int
    created_at: str

    @classmethod
    def create(cls, **kwargs):
        return cls(created_at=datetime.now(UTC).isoformat(), **kwargs)

    def write(self, path: Path) -> None:
        path.parent.mkdir(parents=True, exist_ok=True)
        path.write_text(json.dumps(asdict(self), ensure_ascii=False, indent=2), encoding="utf-8")
