from __future__ import annotations

from typing import Literal

from pydantic import BaseModel, Field, field_validator


class RagQueryRequest(BaseModel):
    query: str = Field(min_length=2, max_length=500)
    language: str | None = Field(default=None, pattern=r"^[a-z]{2}$")
    split: Literal["train", "validation"] = "validation"
    limit: int = Field(default=5, ge=1, le=8)

    @field_validator("query")
    @classmethod
    def normalize_query(cls, value: str) -> str:
        normalized = " ".join(value.split())
        if len(normalized) < 2:
            raise ValueError("query is too short")
        return normalized


class SourceEvidence(BaseModel):
    id: str
    rank: int
    score: float
    text: str
    language: str | None = None
    strategy: str | None = None
    query_id: int | None = None


class LatencyBreakdown(BaseModel):
    input_guard_ms: float
    retrieval_ms: float
    generation_ms: float
    output_guard_ms: float
    total_ms: float


class RagQueryResponse(BaseModel):
    request_id: str
    status: Literal["answered", "refused"]
    answer: str
    grounded: bool
    grounding_score: float = Field(ge=0.0, le=1.0)
    language: str | None
    sources: list[SourceEvidence]
    latency: LatencyBreakdown
    refusal_reason: str | None = None
