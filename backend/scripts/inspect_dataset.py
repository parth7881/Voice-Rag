from __future__ import annotations

import argparse

from goa_rag.config import Settings
from goa_rag.dataset import parquet_hf_uri, resolve_dataset_revision, stream_records


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--language", default="gu")
    parser.add_argument("--split", default="validation", choices=["train", "validation"])
    parser.add_argument("--records", type=int, default=2)
    args = parser.parse_args()

    settings = Settings()
    revision = resolve_dataset_revision(settings.msmarco_dataset, settings.msmarco_revision)
    print(f"Revision: {revision}")
    print(f"Source: {parquet_hf_uri(settings.msmarco_dataset, args.language, args.split, revision)}")
    for record in stream_records(
        settings.msmarco_dataset,
        args.language,
        args.split,
        args.records,
        revision,
        parquet_batch_size=settings.parquet_batch_size,
    ):
        print({
            "query_id": record.query_id,
            "query_type": record.query_type,
            "query": record.query[:120],
            "passage_count": len(record.passages),
            "first_passage": record.passages[0][:160] if record.passages else "",
        })


if __name__ == "__main__":
    main()
