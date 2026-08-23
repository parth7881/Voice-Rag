from __future__ import annotations

import time
import uuid

from .api_models import (
    LatencyBreakdown,
    RagQueryRequest,
    RagQueryResponse,
    SourceEvidence,
)
from .config import Settings
from .embeddings import HybridEmbedder
from .generator import (
    GroqGroundedGenerator,
    GroqProviderError,
)
from .guardrails import (
    check_input,
    validate_citations,
)
from .qdrant_store import QdrantStore
from .retriever import HybridRetriever


def _ms(
    start: float,
    end: float,
) -> float:
    return round(
        (end - start) * 1000,
        2,
    )


class RagService:
    def __init__(
        self,
        settings: Settings | None = None,
    ) -> None:
        self.settings = (
            settings or Settings()
        )

        self.settings.require_qdrant()
        self.settings.require_groq()

        self.embedder = HybridEmbedder(
            self.settings.dense_model,
            self.settings.sparse_model,
        )

        self.store = QdrantStore(
            self.settings
        )

        self.retriever = HybridRetriever(
            self.settings,
            self.embedder,
            self.store,
        )

        self.generator = (
            GroqGroundedGenerator(
                self.settings
            )
        )

    def indexed_points(self) -> int:
        return self.store.count()

    def _retrieve_points(
        self,
        request: RagQueryRequest,
    ):
        """
        Prefer same-language evidence when it exists.

        English is not a translated MSMARCO-XI corpus language in this
        project, and Hindi may be enabled before its own points are indexed.
        The multilingual E5 dense encoder supports cross-lingual retrieval,
        so English/Hindi can safely fall back to the complete indexed corpus
        while the user's original query is preserved for answer generation.
        """

        limit = min(
            request.limit,
            self.settings.rag_top_k,
        )

        language = request.language

        if language in {"gu", "hi"}:
            points = self.retriever.search(
                request.query,
                language=language,
                split=request.split,
                limit=limit,
            )

            if points:
                return points

        if language in {"en", "hi"}:
            return self.retriever.search(
                request.query,
                language=None,
                split=request.split,
                limit=limit,
            )

        return self.retriever.search(
            request.query,
            language=language,
            split=request.split,
            limit=limit,
        )

    def query(
        self,
        request: RagQueryRequest,
    ) -> RagQueryResponse:
        request_id = str(
            uuid.uuid4()
        )

        total_start = (
            time.perf_counter()
        )

        guard_start = (
            time.perf_counter()
        )

        input_decision = check_input(
            request.query
        )

        guard_end = (
            time.perf_counter()
        )

        if not input_decision.allowed:
            total_end = (
                time.perf_counter()
            )

            return RagQueryResponse(
                request_id=request_id,
                status="refused",
                answer=(
                    "I can't process that request "
                    "in this knowledge-base experience."
                ),
                grounded=False,
                grounding_score=0.0,
                language=request.language,
                sources=[],
                latency=LatencyBreakdown(
                    input_guard_ms=_ms(
                        guard_start,
                        guard_end,
                    ),
                    retrieval_ms=0.0,
                    generation_ms=0.0,
                    output_guard_ms=0.0,
                    total_ms=_ms(
                        total_start,
                        total_end,
                    ),
                ),
                refusal_reason=(
                    input_decision.reason
                ),
            )

        retrieval_start = (
            time.perf_counter()
        )

        points = self._retrieve_points(
            request
        )

        retrieval_end = (
            time.perf_counter()
        )

        sources: list[
            SourceEvidence
        ] = []

        source_pairs: list[
            tuple[str, str]
        ] = []

        context_chars = 0

        for rank, point in enumerate(
            points,
            start=1,
        ):
            payload = (
                point.payload or {}
            )

            text = str(
                payload.get(
                    "text",
                    "",
                )
            ).strip()

            if not text:
                continue

            if (
                context_chars + len(text)
                > self.settings.rag_max_context_chars
                and source_pairs
            ):
                break

            source_id = f"S{rank}"

            context_chars += len(
                text
            )

            source_pairs.append(
                (
                    source_id,
                    text,
                )
            )

            sources.append(
                SourceEvidence(
                    id=source_id,
                    rank=rank,
                    score=round(
                        float(point.score),
                        6,
                    ),
                    text=text,
                    language=payload.get(
                        "language"
                    ),
                    strategy=payload.get(
                        "chunk_strategy"
                    ),
                    query_id=payload.get(
                        "query_id"
                    ),
                )
            )

        if not source_pairs:
            total_end = (
                time.perf_counter()
            )

            return RagQueryResponse(
                request_id=request_id,
                status="refused",
                answer=(
                    "I couldn't find supporting "
                    "information in the indexed "
                    "MSMARCO-XI knowledge base."
                ),
                grounded=False,
                grounding_score=0.0,
                language=request.language,
                sources=[],
                latency=LatencyBreakdown(
                    input_guard_ms=_ms(
                        guard_start,
                        guard_end,
                    ),
                    retrieval_ms=_ms(
                        retrieval_start,
                        retrieval_end,
                    ),
                    generation_ms=0.0,
                    output_guard_ms=0.0,
                    total_ms=_ms(
                        total_start,
                        total_end,
                    ),
                ),
                refusal_reason=(
                    "no_retrieval_evidence"
                ),
            )

        generation_start = (
            time.perf_counter()
        )

        try:
            generated = (
                self.generator.generate(
                    request.query,
                    source_pairs,
                )
            )

        except GroqProviderError as exc:
            generation_end = (
                time.perf_counter()
            )

            total_end = (
                time.perf_counter()
            )

            return RagQueryResponse(
                request_id=request_id,
                status="refused",
                answer=(
                    "The answer service is temporarily "
                    "busy. Please try again in a moment."
                ),
                grounded=False,
                grounding_score=0.0,
                language=(
                    request.language
                    or sources[0].language
                ),
                sources=sources[:2],
                latency=LatencyBreakdown(
                    input_guard_ms=_ms(
                        guard_start,
                        guard_end,
                    ),
                    retrieval_ms=_ms(
                        retrieval_start,
                        retrieval_end,
                    ),
                    generation_ms=_ms(
                        generation_start,
                        generation_end,
                    ),
                    output_guard_ms=0.0,
                    total_ms=_ms(
                        total_start,
                        total_end,
                    ),
                ),
                refusal_reason=(
                    exc.reason
                ),
            )

        generation_end = (
            time.perf_counter()
        )

        output_guard_start = (
            time.perf_counter()
        )

        available_ids = {
            source.id
            for source in sources
        }

        citation_decision = (
            validate_citations(
                list(
                    generated.source_ids
                ),
                available_ids,
            )
        )

        output_guard_end = (
            time.perf_counter()
        )

        if not generated.sufficient_evidence:
            total_end = (
                time.perf_counter()
            )

            return RagQueryResponse(
                request_id=request_id,
                status="refused",
                answer=(
                    "The retrieved passages don't "
                    "provide enough evidence for "
                    "a reliable answer."
                ),
                grounded=False,
                grounding_score=0.0,
                language=(
                    request.language
                    or sources[0].language
                ),
                sources=sources[:2],
                latency=LatencyBreakdown(
                    input_guard_ms=_ms(
                        guard_start,
                        guard_end,
                    ),
                    retrieval_ms=_ms(
                        retrieval_start,
                        retrieval_end,
                    ),
                    generation_ms=_ms(
                        generation_start,
                        generation_end,
                    ),
                    output_guard_ms=_ms(
                        output_guard_start,
                        output_guard_end,
                    ),
                    total_ms=_ms(
                        total_start,
                        total_end,
                    ),
                ),
                refusal_reason=(
                    "insufficient_evidence"
                ),
            )

        if (
            not citation_decision.allowed
            or not generated.answer
        ):
            total_end = (
                time.perf_counter()
            )

            return RagQueryResponse(
                request_id=request_id,
                status="refused",
                answer=(
                    "I found potentially relevant "
                    "passages, but the generated "
                    "answer could not be verified "
                    "against them."
                ),
                grounded=False,
                grounding_score=0.0,
                language=(
                    request.language
                    or sources[0].language
                ),
                sources=sources[:2],
                latency=LatencyBreakdown(
                    input_guard_ms=_ms(
                        guard_start,
                        guard_end,
                    ),
                    retrieval_ms=_ms(
                        retrieval_start,
                        retrieval_end,
                    ),
                    generation_ms=_ms(
                        generation_start,
                        generation_end,
                    ),
                    output_guard_ms=_ms(
                        output_guard_start,
                        output_guard_end,
                    ),
                    total_ms=_ms(
                        total_start,
                        total_end,
                    ),
                ),
                refusal_reason=(
                    citation_decision.reason
                    or "empty_generated_answer"
                ),
            )

        cited_set = set(
            generated.source_ids
        )

        cited_sources = [
            source
            for source in sources
            if source.id in cited_set
        ]

        retrieval_signal = min(
            1.0,
            max(
                0.0,
                sources[0].score,
            )
            / 0.666667,
        )

        citation_signal = min(
            1.0,
            len(cited_sources)
            / min(
                2,
                len(sources),
            ),
        )

        grounding_score = round(
            (
                0.6
                * retrieval_signal
            )
            + (
                0.4
                * citation_signal
            ),
            3,
        )

        total_end = (
            time.perf_counter()
        )

        return RagQueryResponse(
            request_id=request_id,
            status="answered",
            answer=generated.answer,
            grounded=True,
            grounding_score=(
                grounding_score
            ),
            language=(
                request.language
                or sources[0].language
            ),
            sources=cited_sources,
            latency=LatencyBreakdown(
                input_guard_ms=_ms(
                    guard_start,
                    guard_end,
                ),
                retrieval_ms=_ms(
                    retrieval_start,
                    retrieval_end,
                ),
                generation_ms=_ms(
                    generation_start,
                    generation_end,
                ),
                output_guard_ms=_ms(
                    output_guard_start,
                    output_guard_end,
                ),
                total_ms=_ms(
                    total_start,
                    total_end,
                ),
            ),
            refusal_reason=None,
        )
