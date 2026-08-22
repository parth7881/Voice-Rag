from __future__ import annotations

from pathlib import Path

from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict


PROJECT_ROOT = Path(__file__).resolve().parents[3]


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=PROJECT_ROOT / ".env",
        env_file_encoding="utf-8",
        extra="ignore",
        case_sensitive=False,
    )

    app_env: str = Field(default="development")
    api_host: str = Field(default="127.0.0.1")
    api_port: int = Field(default=8000, ge=1, le=65535)
    cors_origins: str = Field(default="http://localhost:3000")

    qdrant_url: str = Field(default="")
    qdrant_api_key: str = Field(default="")
    qdrant_collection: str = Field(default="goa_voice_msmarco_v1")

    msmarco_dataset: str = Field(default="ai4bharat/MSMARCO-XI")
    msmarco_revision: str = Field(default="main")

    dense_model: str = Field(default="intfloat/multilingual-e5-small")
    sparse_model: str = Field(default="Qdrant/bm25")
    dense_vector_name: str = Field(default="dense")
    sparse_vector_name: str = Field(default="sparse")

    index_batch_size: int = Field(default=32, ge=1, le=256)
    parquet_batch_size: int = Field(default=16, ge=1, le=128)

    sarvam_api_key: str = Field(default="")
    sarvam_model: str = Field(default="saaras:v3")
    sarvam_timeout_seconds: float = Field(
        default=15.0,
        ge=3.0,
        le=30.0,
    )

    groq_api_key: str = Field(default="")
    groq_model: str = Field(default="openai/gpt-oss-20b")
    groq_timeout_seconds: float = Field(
        default=6.0,
        ge=1.0,
        le=30.0,
    )

    rag_top_k: int = Field(default=5, ge=1, le=8)
    rag_max_context_chars: int = Field(
        default=7000,
        ge=1000,
        le=20000,
    )

    def require_qdrant(self) -> None:
        if not self.qdrant_url.strip():
            raise RuntimeError(
                "QDRANT_URL is missing from the project .env file."
            )

        if (
            self.qdrant_url.startswith("https://")
            and not self.qdrant_api_key.strip()
        ):
            raise RuntimeError(
                "QDRANT_API_KEY is required for Qdrant Cloud."
            )

    def require_sarvam(self) -> None:
        if not self.sarvam_api_key.strip():
            raise RuntimeError(
                "SARVAM_API_KEY is missing from the project .env file."
            )

    def require_groq(self) -> None:
        if not self.groq_api_key.strip():
            raise RuntimeError(
                "GROQ_API_KEY is missing from the project .env file."
            )

    def allowed_origins(self) -> list[str]:
        return [
            origin.strip()
            for origin in self.cors_origins.split(",")
            if origin.strip()
        ]
