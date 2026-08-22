# Goa Voice — HH Goa 2026 Voice-Enabled RAG

Permanent cumulative project base for the HH Goa 2026 Task 2 build.

## Current build status

### Part 1 — Frontend/UI/UX

- Google-style product clarity blended with HH Goa visual language
- Voice-first hero, typed fallback, pipeline states, grounded-answer and evidence UI
- History and latency analytics screens
- Responsive desktop/tablet/mobile layout
- Touch-safe mobile bottom navigation and safe-area support
- Installable PWA shell with conservative offline behavior (no authenticated page caching)
- Reduced-motion and keyboard accessibility support

Part 1 still uses clearly marked preview/mock pipeline output until the real backend is connected.

### Part 2 — Dataset + Retrieval Foundation

- Official `ai4bharat/MSMARCO-XI` dataset
- Immutable dataset revision resolution
- Memory-bounded projected PyArrow Parquet streaming
- Adaptive chunking: atomic, sentence-overlap and token-window-overlap
- Parent/child metadata, global content deduplication and stable IDs
- `intfloat/multilingual-e5-small` ONNX dense embeddings
- `Qdrant/bm25` sparse embeddings with Qdrant IDF modifier
- Dense+sparse hybrid retrieval with Qdrant RRF
- Live index excludes answer/relevance leakage fields
- Evaluation-only access to `is_selected`

See `backend/README.md` for controlled indexing commands.

## Frontend run

```powershell
npm install
npm run dev
```

Open `http://localhost:3000`.

For mobile testing on the same Wi-Fi network, start Next.js on all interfaces:

```powershell
npm run dev -- --hostname 0.0.0.0
```

Then open `http://<YOUR-LAPTOP-IP>:3000` from the phone.

## Backend setup

Copy `.env.example` to `.env`, add Qdrant credentials, then:

```powershell
Set-ExecutionPolicy -Scope Process Bypass
.\backend\setup-part2.ps1
```

## Important

- `.env` is ignored by Git.
- Raw audio is not stored in the current architecture.
- Real Sarvam STT, grounded generation, guardrails and orchestration are Part 3/4 work.
- Do not publish preview latency values as benchmark results.
