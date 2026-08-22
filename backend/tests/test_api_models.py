import pytest
from pydantic import ValidationError

from goa_rag.api_models import RagQueryRequest


def test_query_normalizes_whitespace():
    request = RagQueryRequest(query="  solar   energy  ", language="gu")
    assert request.query == "solar energy"


def test_invalid_language_is_rejected():
    with pytest.raises(ValidationError):
        RagQueryRequest(query="hello", language="gujarati")


def test_limit_is_bounded():
    with pytest.raises(ValidationError):
        RagQueryRequest(query="hello", limit=50)
