from __future__ import annotations

import hashlib
import re
import uuid
from collections.abc import Iterable, Iterator

from .models import Chunk, DatasetRecord

_SENTENCE_BOUNDARY = re.compile(r"(?<=[.!?।॥])\s+|(?<=\n)\s*")
_TOKEN = re.compile(r"\S+")
_NAMESPACE = uuid.UUID("5a7d6f89-f403-4aa6-b9d5-ec32dbd02026")


def token_count(text: str) -> int:
    return len(_TOKEN.findall(text))


def split_sentences(text: str) -> list[str]:
    clean = " ".join(text.split())
    if not clean:
        return []
    parts = [part.strip() for part in _SENTENCE_BOUNDARY.split(clean) if part.strip()]
    return parts or [clean]


def _window_tokens(text: str, size: int, overlap: int) -> list[str]:
    tokens = _TOKEN.findall(text)
    if len(tokens) <= size:
        return [" ".join(tokens)] if tokens else []
    step = max(1, size - overlap)
    windows: list[str] = []
    for start in range(0, len(tokens), step):
        window = tokens[start : start + size]
        if not window:
            break
        windows.append(" ".join(window))
        if start + size >= len(tokens):
            break
    return windows


def _sentence_groups(text: str, target_tokens: int, overlap_sentences: int = 1) -> list[str]:
    sentences = split_sentences(text)
    if len(sentences) <= 1:
        return _window_tokens(text, target_tokens, max(16, target_tokens // 5))

    chunks: list[str] = []
    current: list[str] = []
    current_tokens = 0
    for sentence in sentences:
        count = token_count(sentence)
        if current and current_tokens + count > target_tokens:
            chunks.append(" ".join(current))
            current = current[-overlap_sentences:] if overlap_sentences else []
            current_tokens = sum(token_count(item) for item in current)
        current.append(sentence)
        current_tokens += count
    if current:
        candidate = " ".join(current)
        if not chunks or candidate != chunks[-1]:
            chunks.append(candidate)
    return chunks


def adaptive_passage_chunks(text: str) -> list[tuple[str, str]]:
    """Choose a strategy from passage shape instead of applying one fixed-size splitter."""
    count = token_count(text)
    if count == 0:
        return []
    if count <= 120:
        return [(text.strip(), "atomic_passage")]
    if count <= 300:
        return [(part, "sentence_overlap") for part in _sentence_groups(text, target_tokens=128, overlap_sentences=1)]
    return [(part, "token_window_overlap") for part in _window_tokens(text, size=128, overlap=32)]


def make_chunks(
    record: DatasetRecord,
    *,
    language: str,
    split: str,
    dataset_revision: str,
) -> Iterator[Chunk]:
    seen_hashes: set[str] = set()
    for passage_index, passage in enumerate(record.passages):
        parent_hash = hashlib.sha256(passage.encode("utf-8")).hexdigest()
        parent_id = str(uuid.uuid5(_NAMESPACE, f"{language}:{record.query_id}:{passage_index}:{parent_hash}"))
        for chunk_index, (text, strategy) in enumerate(adaptive_passage_chunks(passage)):
            normalized = " ".join(text.split())
            content_hash = hashlib.sha256(normalized.encode("utf-8")).hexdigest()
            if content_hash in seen_hashes:
                continue
            seen_hashes.add(content_hash)
            chunk_id = str(uuid.uuid5(_NAMESPACE, f"{parent_id}:{chunk_index}:{content_hash}"))
            yield Chunk(
                id=chunk_id,
                text=normalized,
                language=language,
                split=split,
                query_id=record.query_id,
                query_type=record.query_type,
                passage_index=passage_index,
                parent_id=parent_id,
                chunk_index=chunk_index,
                strategy=strategy,
                token_count=token_count(normalized),
                dataset_revision=dataset_revision,
                content_hash=content_hash,
            )


def chunk_records(
    records: Iterable[DatasetRecord],
    *,
    language: str,
    split: str,
    dataset_revision: str,
) -> Iterator[Chunk]:
    global_seen: set[str] = set()
    for record in records:
        for chunk in make_chunks(record, language=language, split=split, dataset_revision=dataset_revision):
            if chunk.content_hash in global_seen:
                continue
            global_seen.add(chunk.content_hash)
            yield chunk
