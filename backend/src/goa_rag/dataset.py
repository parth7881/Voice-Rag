from __future__ import annotations

from collections.abc import Iterator
from pathlib import Path
from typing import Any

import pyarrow.parquet as pq
from huggingface_hub import HfApi, hf_hub_download

from .models import DatasetRecord, EvaluationRecord


LANGUAGE_FILE_CODES = {
    "as": "asm",
    "bn": "ben",
    "gu": "guj",
    "hi": "hin",
    "kn": "kan",
    "ml": "mal",
    "mr": "mar",
    "ne": "nep",
    "or": "ori",
    "pa": "pan",
    "sa": "san",
    "ta": "tam",
    "te": "tel",
    "ur": "urd",
}

SUPPORTED_LANGUAGES = frozenset(
    LANGUAGE_FILE_CODES
)

LIVE_COLUMNS = (
    "query",
    "query_id",
    "query_type",
    "passages.Translated_passages",
)

EVAL_COLUMNS = (
    LIVE_COLUMNS
    + (
        "passages.is_selected",
    )
)


def resolve_dataset_revision(
    dataset_name: str,
    requested_revision: str,
) -> str:
    """
    Resolve a branch/tag into an immutable Hub commit
    for reproducible indexing.
    """

    info = HfApi().dataset_info(
        dataset_name,
        revision=requested_revision,
    )

    if not info.sha:
        raise RuntimeError(
            "Hugging Face did not return "
            "an immutable dataset revision."
        )

    return info.sha


def parquet_file_name(
    language: str,
    split: str,
) -> str:
    if language not in SUPPORTED_LANGUAGES:
        supported = ", ".join(
            sorted(
                SUPPORTED_LANGUAGES
            )
        )

        raise ValueError(
            "Unsupported MSMARCO-XI language "
            f"'{language}'. Supported: {supported}"
        )

    if split not in {
        "train",
        "validation",
    }:
        raise ValueError(
            "split must be 'train' or 'validation'"
        )

    suffix = (
        "train"
        if split == "train"
        else "val"
    )

    return (
        f"{LANGUAGE_FILE_CODES[language]}"
        f"{suffix}.parquet"
    )


def parquet_hf_uri(
    dataset_name: str,
    language: str,
    split: str,
    revision: str,
) -> str:
    """
    Retained for diagnostics/backward compatibility.
    Runtime reads use a local cached Parquet file.
    """

    return (
        f"hf://datasets/"
        f"{dataset_name}@{revision}/"
        f"{split}/"
        f"{parquet_file_name(language, split)}"
    )


def local_parquet_path(
    dataset_name: str,
    language: str,
    split: str,
    revision: str,
) -> Path:
    """
    Ensure the requested Parquet file exists in the
    Hugging Face local cache, then return its local path.

    This avoids range-streaming a large Parquet file
    through HfFileSystem while the ONNX embedding model
    is already resident in memory.
    """

    filename = (
        f"{split}/"
        f"{parquet_file_name(language, split)}"
    )

    path = hf_hub_download(
        repo_id=dataset_name,
        repo_type="dataset",
        filename=filename,
        revision=revision,
    )

    return Path(path)


def _extract_passages(
    row: dict[str, Any],
) -> tuple[str, ...]:
    passages = (
        row.get("passages")
        or {}
    )

    values = (
        passages.get(
            "Translated_passages"
        )
        or row.get(
            "passages.Translated_passages"
        )
        or []
    )

    return tuple(
        str(value).strip()
        for value in values
        if str(value).strip()
    )


def _extract_selected(
    row: dict[str, Any],
) -> tuple[int, ...]:
    passages = (
        row.get("passages")
        or {}
    )

    values = (
        passages.get(
            "is_selected"
        )
        or row.get(
            "passages.is_selected"
        )
        or []
    )

    return tuple(
        int(value)
        for value in values
    )


def _iter_rows(
    *,
    dataset_name: str,
    language: str,
    split: str,
    revision: str,
    columns: tuple[str, ...],
    parquet_batch_size: int,
) -> Iterator[dict[str, Any]]:
    """
    Read only projected columns from a LOCAL cached
    Parquet file in small batches.

    The complete dataset table is never materialized.
    """

    local_path = local_parquet_path(
        dataset_name=dataset_name,
        language=language,
        split=split,
        revision=revision,
    )

    parquet = pq.ParquetFile(
        local_path,
        pre_buffer=False,
    )

    for batch in parquet.iter_batches(
        batch_size=parquet_batch_size,
        columns=list(columns),
        use_threads=False,
    ):
        yield from batch.to_pylist()


def stream_records(
    dataset_name: str,
    language: str,
    split: str,
    limit: int,
    revision: str,
    start: int = 0,
    parquet_batch_size: int = 16,
) -> Iterator[DatasetRecord]:
    """
    Bounded live-index stream.

    Answer/relevance-label columns are intentionally
    excluded from the searchable indexing path.
    """

    if limit <= 0:
        raise ValueError(
            "limit must be positive"
        )

    if start < 0:
        raise ValueError(
            "start must be zero or greater"
        )

    yielded = 0

    for index, row in enumerate(
        _iter_rows(
            dataset_name=dataset_name,
            language=language,
            split=split,
            revision=revision,
            columns=LIVE_COLUMNS,
            parquet_batch_size=(
                parquet_batch_size
            ),
        )
    ):
        if index < start:
            continue

        if yielded >= limit:
            return

        passages = (
            _extract_passages(
                row
            )
        )

        if not passages:
            continue

        yielded += 1

        yield DatasetRecord(
            query=str(
                row.get("query")
                or ""
            ).strip(),
            query_id=int(
                row.get("query_id")
                or 0
            ),
            query_type=str(
                row.get("query_type")
                or ""
            ).strip(),
            passages=passages,
        )


def stream_evaluation_records(
    dataset_name: str,
    language: str,
    split: str,
    limit: int,
    revision: str,
    parquet_batch_size: int = 16,
) -> Iterator[EvaluationRecord]:
    """
    Evaluation-only stream.

    Selection labels are read for evaluation but never
    added to searchable Qdrant payloads.
    """

    if limit <= 0:
        raise ValueError(
            "limit must be positive"
        )

    yielded = 0

    for row in _iter_rows(
        dataset_name=dataset_name,
        language=language,
        split=split,
        revision=revision,
        columns=EVAL_COLUMNS,
        parquet_batch_size=(
            parquet_batch_size
        ),
    ):
        if yielded >= limit:
            return

        passages = (
            _extract_passages(
                row
            )
        )

        selected = (
            _extract_selected(
                row
            )
        )

        if not passages:
            continue

        yielded += 1

        yield EvaluationRecord(
            query=str(
                row.get("query")
                or ""
            ).strip(),
            query_id=int(
                row.get("query_id")
                or 0
            ),
            query_type=str(
                row.get("query_type")
                or ""
            ).strip(),
            passages=passages,
            selected=selected,
        )