from functools import lru_cache
from typing import Literal
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    # LLM Settings
    llm_primary_provider: str = "groq"
    llm_primary_model: str = "qwen/qwen3.8-27b"
    groq_api_key: str = ""

    llm_fallback_provider: str = "gemini"
    llm_fallback_model: str = "gemini-3.8-flash"
    gemini_api_key: str = ""

    llm_timeout_seconds: int = 30
    llm_max_retries: int = 1

    # Database
    database_url: str = "sqlite+aiosqlite:///./ledgerflow.db"

    # Storage
    storage_backend: Literal["local", "supabase"] = "local"
    local_storage_path: str = "./storage/uploads"
    supabase_url: str = ""
    supabase_service_key: str = ""
    supabase_storage_bucket: str = "ledgerflow-invoices"

    # Upload Constraints
    max_file_size_mb: int = 10
    max_page_count: int = 20

    # Tolerance & Business Policies (Decision D-004)
    tolerance_percent: float = 1.0  # 1%
    tolerance_cap_inr: float = 500.0  # ₹500
    rounding_allowance_inr: float = 1.0  # ₹1.00

    # Application
    app_env: str = "development"
    app_host: str = "0.0.0.0"
    app_port: int = 8000
    frontend_url: str = "http://localhost:3000"
    secret_key: str = "ledgerflow-dev-secret-key-change-in-prod"

    # OCR / Tesseract fallback
    tessdata_prefix: str = ""
    tesseract_lang: str = "eng"

    model_config = SettingsConfigDict(
        env_file=("../.env", ".env"),
        env_file_encoding="utf-8",
        extra="ignore"
    )


@lru_cache
def get_settings() -> Settings:
    return Settings()
