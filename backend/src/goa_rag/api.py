from __future__ import annotations

import logging
from contextlib import asynccontextmanager

from fastapi import (
    FastAPI,
    File,
    Form,
    HTTPException,
    Request,
    UploadFile,
)
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

from .api_models import RagQueryRequest, RagQueryResponse
from .config import Settings
from .rag_service import RagService
from .stt import SarvamSpeechToText


logger = logging.getLogger(__name__)


class VoiceTranscriptionResponse(BaseModel):
    status: str
    transcript: str
    language_code: str | None
    provider_request_id: str | None
    latency_ms: float


@asynccontextmanager
async def lifespan(app: FastAPI):
    settings = Settings()

    app.state.rag_service = RagService(settings)
    app.state.stt_service = SarvamSpeechToText(settings)

    try:
        yield
    finally:
        pass


settings = Settings()


app = FastAPI(
    title="HH Goa Voice RAG API",
    version="0.4.0",
    docs_url="/docs" if settings.app_env != "production" else None,
    redoc_url=None,
    lifespan=lifespan,
)


# Public hackathon API: no cookies/auth credentials are used by the browser.
# Allow cross-origin requests so Vercel production/preview frontends can call
# the Railway API directly without browser CORS failures.
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/healthz")
def healthz() -> dict[str, str]:
    return {
        "status": "ok",
    }


@app.get("/readyz")
def readyz(request: Request) -> dict[str, int | str]:
    try:
        points = request.app.state.rag_service.indexed_points()

    except Exception as exc:
        logger.exception("RAG readiness check failed")

        raise HTTPException(
            status_code=503,
            detail="Retrieval service is not ready.",
        ) from exc

    return {
        "status": "ready",
        "indexed_points": points,
    }


@app.post(
    "/v1/rag/query",
    response_model=RagQueryResponse,
)
def rag_query(
    payload: RagQueryRequest,
    request: Request,
) -> RagQueryResponse:
    try:
        return request.app.state.rag_service.query(payload)

    except RuntimeError as exc:
        logger.exception("RAG runtime failure")

        raise HTTPException(
            status_code=503,
            detail=str(exc),
        ) from exc

    except Exception as exc:
        logger.exception("Unhandled RAG query failure")

        raise HTTPException(
            status_code=500,
            detail="RAG request failed safely.",
        ) from exc


@app.post(
    "/v1/voice/transcribe",
    response_model=VoiceTranscriptionResponse,
)
async def voice_transcribe(
    request: Request,
    file: UploadFile = File(...),
    language_code: str = Form(default="unknown"),
) -> VoiceTranscriptionResponse:
    try:
        audio_bytes = await file.read()

        result = request.app.state.stt_service.transcribe(
            audio_bytes=audio_bytes,
            filename=file.filename or "recording.webm",
            content_type=file.content_type or "application/octet-stream",
            language_code=language_code,
        )

        return VoiceTranscriptionResponse(
            status="transcribed",
            transcript=result.transcript,
            language_code=result.language_code,
            provider_request_id=result.request_id,
            latency_ms=result.latency_ms,
        )

    except ValueError as exc:
        raise HTTPException(
            status_code=400,
            detail=str(exc),
        ) from exc

    except RuntimeError as exc:
        logger.exception("Voice transcription failure")

        raise HTTPException(
            status_code=503,
            detail=str(exc),
        ) from exc

    except Exception as exc:
        logger.exception("Unhandled voice transcription failure")

        raise HTTPException(
            status_code=500,
            detail="Voice transcription failed safely.",
        ) from exc
