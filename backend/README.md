# Part 2 — MSMARCO-XI retrieval foundation

This folder adds the real retrieval layer required by HH Goa Task 2 while preserving the polished Part 1 frontend.

## Architecture

- Official dataset: `ai4bharat/MSMARCO-XI`
- Immutable Hugging Face revision pinning for reproducibility
- Direct PyArrow Parquet batch streaming with column projection
- Live indexing deliberately excludes `Answer`, `Eng_Answer` and `is_selected`
- Adaptive chunking: atomic passages, sentence-boundary chunks with overlap, and token-window overlap for long passages
- Parent/child metadata and stable deterministic chunk IDs
- Dense multilingual retrieval: `intfloat/multilingual-e5-small` via ONNX/FastEmbed
- Sparse retrieval: `Qdrant/bm25`
- Qdrant hybrid search with server-side reciprocal rank fusion (RRF)
- Qdrant sparse IDF modifier enabled

## Why the loader is memory bounded

The official dataset is very large. The indexer does not call `list(dataset)` and does not materialize a complete Parquet table. It opens the revision-pinned language Parquet file through Hugging Face's filesystem and uses `pyarrow.parquet.ParquetFile.iter_batches()` with only the columns needed by the live retrieval index.

## Setup on Windows

From the permanent project root:

```powershell
Copy-Item .env.example .env
notepad .env
```

Add your Qdrant Cloud values, then:

```powershell
Set-ExecutionPolicy -Scope Process Bypass
.\backend\setup-part2.ps1
```

The script creates `backend\.venv`, installs pinned dependencies, runs tests and verifies Qdrant + the official MSMARCO-XI repository. It does not print the API key.

## Inspect real Gujarati records first

```powershell
$env:PYTHONPATH="backend\src"
.\backend\.venv\Scripts\python.exe backend\scripts\inspect_dataset.py --language gu --split validation --records 2
```

## Controlled first index

Start small. `--recreate` intentionally deletes only the configured Qdrant collection before creating the new index.

```powershell
$env:PYTHONPATH="backend\src"
.\backend\.venv\Scripts\python.exe backend\scripts\index_msmarco.py --languages gu --split validation --records-per-language 1000 --recreate
```

After that succeeds, add Hindi or increase the sample deliberately.

## Hybrid retrieval test

```powershell
$env:PYTHONPATH="backend\src"
.\backend\.venv\Scripts\python.exe backend\scripts\search.py "ભારતમાં સૌર ઊર્જાનો ઉપયોગ કેવી રીતે થાય છે?" --language gu --split validation
```

## Retrieval evaluation

`is_selected` is read only by the evaluation command and never stored in the live index.

```powershell
$env:PYTHONPATH="backend\src"
.\backend\.venv\Scripts\python.exe backend\scripts\evaluate.py --language gu --records 100
```

Do not publish Recall@5 / MRR@10 numbers until they come from the real final collection configuration.
