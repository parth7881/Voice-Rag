from __future__ import annotations

import argparse
import json
import math
import statistics
import time
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

import httpx
import pyarrow.parquet as pq
from huggingface_hub import hf_hub_download

from goa_rag.config import Settings
from goa_rag.dataset import resolve_dataset_revision


PROJECT_ROOT = Path(__file__).resolve().parents[2]

OUTPUT_PATH = (
    PROJECT_ROOT
    / "public"
    / "benchmark-rag.json"
)


LANGUAGE_FILES = {
    "gu": {
        "validation": "validation/gujval.parquet",
    },
    "hi": {
        "validation": "validation/hinval.parquet",
    },
    "en": {
        "validation": "validation/engval.parquet",
    },
}


def percentile(
    values: list[float],
    percent: float,
) -> float:
    if not values:
        return 0.0

    ordered = sorted(values)

    if len(ordered) == 1:
        return ordered[0]

    position = (
        (len(ordered) - 1)
        * percent
        / 100.0
    )

    lower = math.floor(position)
    upper = math.ceil(position)

    if lower == upper:
        return ordered[lower]

    fraction = position - lower

    return (
        ordered[lower]
        + (
            ordered[upper]
            - ordered[lower]
        )
        * fraction
    )


def summarize(
    values: list[float],
) -> dict[str, float]:
    if not values:
        return {
            "p50_ms": 0.0,
            "p70_ms": 0.0,
            "p100_ms": 0.0,
            "mean_ms": 0.0,
        }

    return {
        "p50_ms": round(
            percentile(values, 50),
            2,
        ),
        "p70_ms": round(
            percentile(values, 70),
            2,
        ),
        "p100_ms": round(
            max(values),
            2,
        ),
        "mean_ms": round(
            statistics.fmean(values),
            2,
        ),
    }


def load_queries(
    *,
    dataset: str,
    revision: str,
    language: str,
    split: str,
    count: int,
) -> list[str]:

    language_config = (
        LANGUAGE_FILES.get(language)
    )

    if not language_config:
        raise RuntimeError(
            f"No benchmark dataset mapping for language: {language}"
        )

    filename = (
        language_config.get(split)
    )

    if not filename:
        raise RuntimeError(
            f"No benchmark dataset mapping for "
            f"{language}/{split}"
        )

    print(
        "Preparing local MSMARCO-XI benchmark file..."
    )

    local_path = hf_hub_download(
        repo_id=dataset,
        repo_type="dataset",
        filename=filename,
        revision=revision,
    )

    print(
        "Local dataset:",
        local_path,
    )

    parquet = pq.ParquetFile(
        local_path
    )

    queries: list[str] = []

    for batch in parquet.iter_batches(
        batch_size=32,
        columns=["query"],
    ):
        query_column = (
            batch.column("query")
        )

        for value in query_column:
            query = value.as_py()

            if (
                isinstance(query, str)
                and query.strip()
            ):
                queries.append(
                    query.strip()
                )

            if len(queries) >= count:
                return queries

    return queries


def main() -> None:
    parser = argparse.ArgumentParser()

    parser.add_argument(
        "--language",
        default="gu",
    )

    parser.add_argument(
        "--split",
        default="validation",
    )

    parser.add_argument(
        "--records",
        type=int,
        default=10,
    )

    parser.add_argument(
        "--limit",
        type=int,
        default=5,
    )

    parser.add_argument(
        "--api-base",
        default="http://127.0.0.1:8000",
    )

    args = parser.parse_args()

    if args.records < 1:
        raise SystemExit(
            "--records must be at least 1."
        )

    settings = Settings()

    revision = resolve_dataset_revision(
        settings.msmarco_dataset,
        settings.msmarco_revision,
    )

    api_base = (
        args.api_base.rstrip("/")
    )

    ready_url = (
        f"{api_base}/readyz"
    )

    query_url = (
        f"{api_base}/v1/rag/query"
    )

    client = httpx.Client(
        timeout=httpx.Timeout(30.0)
    )

    print(
        "Checking running RAG API..."
    )

    try:
        ready = client.get(
            ready_url
        )

        ready.raise_for_status()

    except Exception as exc:
        raise SystemExit(
            "Backend API is not ready. "
            "Start backend/run-part3.ps1 first. "
            f"Details: {exc}"
        ) from exc

    print(
        "API ready:",
        ready.json(),
    )

    try:
        queries = load_queries(
            dataset=settings.msmarco_dataset,
            revision=revision,
            language=args.language,
            split=args.split,
            count=args.records,
        )

    except Exception as exc:
        raise SystemExit(
            f"Could not prepare local benchmark queries: {exc}"
        ) from exc

    if not queries:
        raise SystemExit(
            "No benchmark queries were found."
        )

    print(
        f"Queries loaded: {len(queries)}"
    )
    print()

    total_values: list[float] = []
    wall_values: list[float] = []

    input_guard_values: list[float] = []
    retrieval_values: list[float] = []
    generation_values: list[float] = []
    output_guard_values: list[float] = []

    answered = 0
    refused = 0
    grounded = 0
    failures = 0

    failure_messages: list[str] = []

    for index, query in enumerate(
        queries,
        start=1,
    ):
        payload = {
            "query": query,
            "language": args.language,
            "split": args.split,
            "limit": args.limit,
        }

        started = time.perf_counter()

        try:
            response = client.post(
                query_url,
                json=payload,
            )

            wall_ms = (
                time.perf_counter()
                - started
            ) * 1000

            response.raise_for_status()

            body: dict[str, Any] = (
                response.json()
            )

            latency = body["latency"]

            total_ms = float(
                latency["total_ms"]
            )

            total_values.append(
                total_ms
            )

            wall_values.append(
                wall_ms
            )

            input_guard_values.append(
                float(
                    latency[
                        "input_guard_ms"
                    ]
                )
            )

            retrieval_values.append(
                float(
                    latency[
                        "retrieval_ms"
                    ]
                )
            )

            generation_values.append(
                float(
                    latency[
                        "generation_ms"
                    ]
                )
            )

            output_guard_values.append(
                float(
                    latency[
                        "output_guard_ms"
                    ]
                )
            )

            status = body.get(
                "status"
            )

            if status == "answered":
                answered += 1

            if status == "refused":
                refused += 1

            if body.get("grounded"):
                grounded += 1

            print(
                f"[{index}/{len(queries)}] "
                f"{status} | "
                f"RAG={total_ms:.2f} ms | "
                f"HTTP={wall_ms:.2f} ms"
            )

        except Exception as exc:
            failures += 1

            message = (
                f"Query {index}: "
                f"{type(exc).__name__}: "
                f"{exc}"
            )

            failure_messages.append(
                message
            )

            print(
                f"[{index}/{len(queries)}] "
                f"FAILED | {exc}"
            )

    client.close()

    successful = len(
        total_values
    )

    if successful == 0:
        raise SystemExit(
            "No successful benchmark requests."
        )

    latency_summary = summarize(
        total_values
    )

    wall_summary = summarize(
        wall_values
    )

    result = {
        "benchmark_version": 3,

        "generated_at": (
            datetime.now(
                timezone.utc
            ).isoformat()
        ),

        "dataset": (
            settings.msmarco_dataset
        ),

        "dataset_revision": revision,

        "language": args.language,
        "split": args.split,

        "requested_queries": (
            args.records
        ),

        "processed_queries": (
            len(queries)
        ),

        "successful_queries": (
            successful
        ),

        "failed_queries": (
            failures
        ),

        "latency": (
            latency_summary
        ),

        "wall_latency": (
            wall_summary
        ),

        "stages": {
            "input_guard": summarize(
                input_guard_values
            ),

            "retrieval": summarize(
                retrieval_values
            ),

            "generation": summarize(
                generation_values
            ),

            "output_guard": summarize(
                output_guard_values
            ),
        },

        "quality": {
            "answered": answered,
            "refused": refused,
            "grounded": grounded,

            "answered_rate": round(
                answered / successful,
                4,
            ),

            "refusal_rate": round(
                refused / successful,
                4,
            ),

            "grounded_rate": round(
                grounded / successful,
                4,
            ),
        },

        "target": {
            "target_ms": 200,

            "p50_meets_target": (
                latency_summary[
                    "p50_ms"
                ] < 200
            ),

            "p70_meets_target": (
                latency_summary[
                    "p70_ms"
                ] < 200
            ),

            "p100_meets_target": (
                latency_summary[
                    "p100_ms"
                ] < 200
            ),
        },

        "failures": (
            failure_messages[:10]
        ),
    }

    OUTPUT_PATH.parent.mkdir(
        parents=True,
        exist_ok=True,
    )

    OUTPUT_PATH.write_text(
        json.dumps(
            result,
            ensure_ascii=False,
            indent=2,
        ),
        encoding="utf-8",
    )

    print()
    print(
        "REAL RAG BENCHMARK COMPLETE"
    )

    print(
        f"Successful: {successful}"
    )

    print(
        f"Failed: {failures}"
    )

    print(
        f"P50: {latency_summary['p50_ms']} ms"
    )

    print(
        f"P70: {latency_summary['p70_ms']} ms"
    )

    print(
        f"P100: {latency_summary['p100_ms']} ms"
    )

    print(
        f"HTTP P50: {wall_summary['p50_ms']} ms"
    )

    print(
        f"Grounded rate: "
        f"{grounded / successful:.2%}"
    )

    print(
        "Written to:",
        OUTPUT_PATH,
    )


if __name__ == "__main__":
    main()