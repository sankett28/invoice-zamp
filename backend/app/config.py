from pathlib import Path
from functools import lru_cache
from typing import Literal
from pydantic_settings import BaseSettings, SettingsConfigDict

BACKEND_DIR = Path(__file__).resolve().parent.parent
DEFAULT_DB_PATH = (BACKEND_DIR / "ledgerflow.db").as_posix()


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
    database_url: str = f"sqlite+aiosqlite:///{DEFAULT_DB_PATH}"

    # Storage
    storage_backend: Literal["local", "supabase", "s3"] = "local"
    local_storage_path: str = "./storage/uploads"
    supabase_url: str = ""
    supabase_service_key: str = ""
    supabase_storage_bucket: str = "ledgerflow-invoices"
    s3_bucket: str = "ledgerflow-invoices"
    s3_region: str = "ap-south-1"
    s3_access_key: str = ""
    s3_secret_key: str = ""
    s3_endpoint_url: str = ""

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

    def model_post_init(self, __context):
        # Ensure SQLite path resolves to backend/ledgerflow.db regardless of process CWD
        if self.database_url.startswith("sqlite+aiosqlite:///.") or self.database_url == "sqlite+aiosqlite:///ledgerflow.db":
            db_file = (BACKEND_DIR / "ledgerflow.db").as_posix()
            self.database_url = f"sqlite+aiosqlite:///{db_file}"

    model_config = SettingsConfigDict(
        env_file=("../.env", ".env"),
        env_file_encoding="utf-8",
        extra="ignore"
    )


@lru_cache
def get_settings() -> Settings:
    return Settings()
