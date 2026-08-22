# Part 3 — Grounded RAG API

This update connects the existing Qdrant hybrid retrieval index to a typed FastAPI RAG harness and Groq grounded generation.

## Setup

From the permanent project root:

```powershell
Set-ExecutionPolicy -Scope Process Bypass
.\backend\setup-part3.ps1
```

## Live CLI verification

```powershell
$env:PYTHONPATH="backend\src"
.\backend\.venv\Scripts\python.exe backend\scripts\test_rag.py "રશેલ કાર્સને શા માટે સહન કરવાની જવાબદારી લખી?" --language gu --split validation
```

## Run API

```powershell
.\backend\run-part3.ps1
```

Then in another terminal run the existing Next.js frontend:

```powershell
npm run dev
```

API endpoints:
- `GET /healthz`
- `GET /readyz`
- `POST /v1/rag/query`

Part 4 will replace the microphone placeholder with real Sarvam streaming STT.
