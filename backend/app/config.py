from pydantic_settings import BaseSettings
from functools import lru_cache


class Settings(BaseSettings):
    # Environment
    app_env: str = "development"
    debug: bool = True
    secret_key: str = "change-me-to-a-random-secret"

    # Database
    database_url: str = "mysql+pymysql://pmo_user:secreto@localhost:3306/pmo_db?charset=utf8mb4"
    database_pool_size: int = 5

    # Server
    host: str = "0.0.0.0"
    port: int = 8080

    # Auth
    jwt_secret: str = "change-me-to-a-random-jwt-secret"
    jwt_expiration_hours: int = 24
    password_reset_token_expiry_minutes: int = 30

    # CORS
    cors_origins: list[str] = ["http://localhost:5173", "http://localhost:3000"]

    # i18n
    default_locale: str = "es"
    supported_locales: str = "es,en"

    # File uploads
    max_upload_size_mb: int = 25
    upload_dir: str = "./uploads"
    allowed_extensions: str = "pdf,xlsx,xls,docx,doc,pptx,ppt,png,jpg,jpeg,txt,srt,mpp,xml"

    # AI
    ai_enabled: bool = False
    ai_default_engine: str = "ollama"
    ollama_base_url: str = "http://localhost:11434"
    ollama_model: str = "qwen2.5:7b"
    ollama_timeout_seconds: int = 120
    anthropic_api_key: str = ""
    claude_model: str = "claude-sonnet-4-20250514"
    claude_max_tokens: int = 4096
    gemini_api_key: str = ""
    gemini_model: str = "gemini-2.0-flash"
    gemini_max_tokens: int = 4096
    ai_temperature: float = 0.3
    ai_output_language: str = "es"

    model_config = {
        "env_file": ["../.env", "../../.env"],  # backend/.env or pmo_app/.env
        "env_file_encoding": "utf-8",
        "extra": "ignore",
    }


@lru_cache
def get_settings() -> Settings:
    return Settings()
