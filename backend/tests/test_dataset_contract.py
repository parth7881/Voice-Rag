from pathlib import Path


def test_live_dataset_projection_excludes_answer_leakage() -> None:
    source = (Path(__file__).parents[1] / "src" / "goa_rag" / "dataset.py").read_text(encoding="utf-8")
    live_line = next(line for line in source.splitlines() if line.startswith("LIVE_COLUMNS"))
    assert "Answer" not in live_line
    assert "Eng_Answer" not in live_line
    assert "is_selected" not in live_line
    assert "Translated_passages" in live_line


def test_loader_uses_projected_parquet_batches() -> None:
    source = (Path(__file__).parents[1] / "src" / "goa_rag" / "dataset.py").read_text(encoding="utf-8")
    assert "ParquetFile" in source
    assert "iter_batches" in source
    assert "pre_buffer=False" in source
    assert "use_threads=False" in source
