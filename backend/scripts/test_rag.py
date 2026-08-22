from __future__ import annotations

import argparse

from goa_rag.api_models import RagQueryRequest
from goa_rag.rag_service import RagService


def main() -> None:
    parser = argparse.ArgumentParser(description="Run one real grounded RAG query")
    parser.add_argument("query")
    parser.add_argument("--language", default=None)
    parser.add_argument("--split", default="validation", choices=["train", "validation"])
    parser.add_argument("--limit", type=int, default=5)
    args = parser.parse_args()

    service = RagService()
    response = service.query(
        RagQueryRequest(
            query=args.query,
            language=args.language,
            split=args.split,
            limit=args.limit,
        )
    )
    print(response.model_dump_json(indent=2))


if __name__ == "__main__":
    main()
