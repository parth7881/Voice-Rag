from goa_rag.models import Chunk


def test_chunk_payload_is_search_safe() -> None:
    chunk = Chunk(
        id="id",
        text="retrievable context",
        language="gu",
        split="validation",
        query_id=1,
        query_type="DESCRIPTION",
        passage_index=2,
        parent_id="parent",
        chunk_index=0,
        strategy="atomic_passage",
        token_count=2,
        dataset_revision="sha",
        content_hash="hash",
    )
    payload = chunk.payload()
    assert payload["text"] == "retrievable context"
    assert payload["language"] == "gu"
    assert payload["dataset_revision"] == "sha"
    assert not ({"Answer", "Eng_Answer", "is_selected"} & payload.keys())
