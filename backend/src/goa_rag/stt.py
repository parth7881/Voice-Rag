from __future__ import annotations

import time
from dataclasses import dataclass

import httpx

from .config import Settings


@dataclass(frozen=True, slots=True)
class TranscriptionResult:
    request_id: str | None
    transcript: str
    language_code: str | None
    latency_ms: float


class SarvamSpeechToText:
    ENDPOINT = "https://api.sarvam.ai/speech-to-text"

    MAX_AUDIO_BYTES = 15 * 1024 * 1024

    SUPPORTED_LANGUAGE_CODES = {
        "unknown",
        "gu-IN",
        "hi-IN",
        "en-IN",
        "bn-IN",
        "kn-IN",
        "ml-IN",
        "mr-IN",
        "od-IN",
        "pa-IN",
        "ta-IN",
        "te-IN",
        "as-IN",
        "ur-IN",
        "ne-IN",
    }

    SUPPORTED_CONTENT_TYPES = {
        "audio/mpeg",
        "audio/mp3",
        "audio/wav",
        "audio/x-wav",
        "audio/webm",
        "audio/ogg",
        "audio/opus",
        "audio/flac",
        "audio/mp4",
        "audio/x-m4a",
        "audio/aac",
        "audio/aiff",
        "application/octet-stream",
    }

    def __init__(self, settings: Settings) -> None:
        settings.require_sarvam()
        self.settings = settings

        self.client = httpx.Client(
            timeout=settings.sarvam_timeout_seconds,
            headers={
                "api-subscription-key": settings.sarvam_api_key,
            },
        )

    @staticmethod
    def _normalize_content_type(
        content_type: str | None,
    ) -> str:
        if not content_type:
            return "application/octet-stream"

        return (
            content_type
            .split(";", 1)[0]
            .strip()
            .lower()
        )

    def transcribe(
        self,
        *,
        audio_bytes: bytes,
        filename: str = "recording.webm",
        content_type: str = "audio/webm",
        language_code: str = "unknown",
    ) -> TranscriptionResult:

        if not audio_bytes:
            raise ValueError(
                "Audio file is empty."
            )

        if len(audio_bytes) > self.MAX_AUDIO_BYTES:
            raise ValueError(
                "Audio file is too large."
            )

        if language_code not in self.SUPPORTED_LANGUAGE_CODES:
            raise ValueError(
                f"Unsupported language code: {language_code}"
            )

        normalized_content_type = (
            self._normalize_content_type(
                content_type
            )
        )

        if (
            normalized_content_type
            not in self.SUPPORTED_CONTENT_TYPES
        ):
            raise ValueError(
                "Unsupported audio content type: "
                + normalized_content_type
            )

        files = {
            "file": (
                filename,
                audio_bytes,
                normalized_content_type,
            )
        }

        data = {
            "model": self.settings.sarvam_model,
            "mode": "transcribe",
            "language_code": language_code,
        }

        started = time.perf_counter()

        try:
            response = self.client.post(
                self.ENDPOINT,
                files=files,
                data=data,
            )

        except httpx.TimeoutException as exc:
            raise RuntimeError(
                "Sarvam STT request timed out."
            ) from exc

        except httpx.NetworkError as exc:
            raise RuntimeError(
                "Sarvam STT service is unavailable."
            ) from exc

        latency_ms = round(
            (
                time.perf_counter()
                - started
            ) * 1000,
            2,
        )

        if response.status_code in {401, 403}:
            raise RuntimeError(
                "Sarvam authentication failed."
            )

        if response.status_code == 429:
            raise RuntimeError(
                "Sarvam rate limit or credits exceeded."
            )

        if response.status_code in {400, 422}:
            raise ValueError(
                "Sarvam rejected the request: "
                + response.text[:800]
            )

        if response.status_code >= 500:
            raise RuntimeError(
                "Sarvam STT service is temporarily unavailable."
            )

        response.raise_for_status()

        try:
            body = response.json()

        except ValueError as exc:
            raise RuntimeError(
                "Sarvam returned invalid JSON."
            ) from exc

        transcript = body.get(
            "transcript"
        )

        if (
            not isinstance(
                transcript,
                str,
            )
            or not transcript.strip()
        ):
            raise RuntimeError(
                "Sarvam returned an empty transcript."
            )

        request_id = body.get(
            "request_id"
        )

        language = body.get(
            "language_code"
        )

        return TranscriptionResult(
            request_id=(
                request_id
                if isinstance(
                    request_id,
                    str,
                )
                else None
            ),
            transcript=transcript.strip(),
            language_code=(
                language
                if isinstance(
                    language,
                    str,
                )
                else None
            ),
            latency_ms=latency_ms,
        )
