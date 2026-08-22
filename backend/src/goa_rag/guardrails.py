from __future__ import annotations

import re
from dataclasses import dataclass


@dataclass(frozen=True, slots=True)
class GuardrailDecision:
    allowed: bool
    reason: str | None = None


_PROMPT_INJECTION_PATTERNS = (
    r"\bignore (all |the )?(previous|prior) (instructions|rules)\b",
    r"\breveal (the )?(system|developer) (prompt|message|instructions)\b",
    r"\bshow (me )?(your )?(system|developer) prompt\b",
    r"\bjailbreak\b",
)

_HIGH_RISK_PATTERNS = (
    r"\bhow (do i|to) (make|build) (a )?(bomb|explosive)\b",
    r"\bhow (do i|to) kill (someone|a person)\b",
    r"\bsuicide (method|instructions)\b",
    r"बम (कैसे|कैसे बनाएं|बनाने)",
    r"બોમ્બ (કેવી રીતે|બનાવ)",
)


def check_input(query: str) -> GuardrailDecision:
    compact = " ".join(query.split())
    if not compact:
        return GuardrailDecision(False, "empty_query")
    if len(compact) > 500:
        return GuardrailDecision(False, "query_too_long")
    if any(ord(char) < 32 and char not in "\t\n\r" for char in compact):
        return GuardrailDecision(False, "invalid_control_characters")

    lowered = compact.casefold()
    for pattern in _PROMPT_INJECTION_PATTERNS:
        if re.search(pattern, lowered, flags=re.IGNORECASE):
            return GuardrailDecision(False, "prompt_injection_detected")

    for pattern in _HIGH_RISK_PATTERNS:
        if re.search(pattern, lowered, flags=re.IGNORECASE):
            return GuardrailDecision(False, "unsafe_request")

    return GuardrailDecision(True)


def validate_citations(cited_ids: list[str], available_ids: set[str]) -> GuardrailDecision:
    if not cited_ids:
        return GuardrailDecision(False, "answer_has_no_sources")
    if any(source_id not in available_ids for source_id in cited_ids):
        return GuardrailDecision(False, "answer_cites_unknown_source")
    return GuardrailDecision(True)
