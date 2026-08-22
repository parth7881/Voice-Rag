from goa_rag.chunking import adaptive_passage_chunks, make_chunks, token_count
from goa_rag.models import DatasetRecord


def words(count: int) -> str:
    return " ".join(f"w{i}" for i in range(count))


def test_short_passage_is_atomic() -> None:
    chunks = adaptive_passage_chunks(words(40))
    assert len(chunks) == 1
    assert chunks[0][1] == "atomic_passage"


def test_medium_passage_uses_sentence_aware_strategy() -> None:
    text = " ".join(["This is a sentence with useful context." for _ in range(30)])
    chunks = adaptive_passage_chunks(text)
    assert len(chunks) >= 2
    assert all(strategy == "sentence_overlap" for _, strategy in chunks)


def test_long_passage_uses_overlapping_token_windows() -> None:
    chunks = adaptive_passage_chunks(words(340))
    assert len(chunks) >= 3
    assert all(strategy == "token_window_overlap" for _, strategy in chunks)
    assert token_count(chunks[0][0]) == 128


def test_chunk_ids_are_stable_and_payload_contains_no_answer_fields() -> None:
    record = DatasetRecord(query="q", query_id=42, query_type="DESCRIPTION", passages=("A useful passage.",))
    first = list(make_chunks(record, language="gu", split="validation", dataset_revision="abc"))
    second = list(make_chunks(record, language="gu", split="validation", dataset_revision="abc"))
    assert first[0].id == second[0].id
    payload = first[0].payload()
    assert "Answer" not in payload
    assert "Eng_Answer" not in payload
    assert "is_selected" not in payload
    assert payload["chunk_strategy"] == "atomic_passage"
