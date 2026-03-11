from typing import List, Optional

from pydantic import AnyHttpUrl, BaseSettings, validator


class Settings(BaseSettings):
    app_name: str = "AgroGuard API"
    backend_cors_origins: List[AnyHttpUrl] = []
    allowed_hosts: List[str] = ["*"]

    environment: str = "development"

    database_url: str = "postgresql+psycopg2://postgres:postgres@localhost:5432/agroguard"
    redis_url: str = "redis://localhost:6379/0"

    jwt_secret: str = "change-me"
    jwt_algorithm: str = "HS256"
    jwt_exp_minutes: int = 60
    jwt_cookie_name: str = "agroguard_token"
    cookie_secure: bool = False

    ml_service_url: str = "http://localhost:9000"

    # OTP and rate-limiting
    otp_exp_minutes: int = 5
    otp_request_limit: int = 5
    otp_request_window_seconds: int = 900
    otp_verify_limit: int = 10
    otp_verify_window_seconds: int = 900
    medicine_verify_limit: int = 30
    medicine_verify_window_seconds: int = 60

    # SMTP (optional but production-ready)
    smtp_host: Optional[str] = None
    smtp_port: int = 587
    smtp_user: Optional[str] = None
    smtp_password: Optional[str] = None
    smtp_from: Optional[str] = None
    smtp_use_tls: bool = True

    r2_account_id: Optional[str] = None
    r2_access_key: Optional[str] = None
    r2_secret_key: Optional[str] = None
    r2_bucket: Optional[str] = None
    r2_public_base: Optional[str] = None

    @validator("backend_cors_origins", pre=True)
    def assemble_cors_origins(cls, value):
        if isinstance(value, str):
            value = value.strip()
            if not value:
                return []
            if value.startswith("["):
                # Supports JSON array syntax from env files.
                import json

                return json.loads(value)
            return [v.strip() for v in value.split(",") if v.strip()]
        return value

    @validator("allowed_hosts", pre=True)
    def assemble_allowed_hosts(cls, value):
        if isinstance(value, str):
            value = value.strip()
            if not value:
                return ["*"]
            if value.startswith("["):
                import json

                return json.loads(value)
            return [v.strip() for v in value.split(",") if v.strip()]
        return value

    @validator("cookie_secure", pre=True, always=True)
    def infer_cookie_secure(cls, value, values):
        if isinstance(value, str):
            normalized = value.strip().lower()
            if normalized in {"1", "true", "yes", "on"}:
                return True
            if normalized in {"0", "false", "no", "off"}:
                return False
        if value is not None:
            return bool(value)
        return values.get("environment") == "production"

    class Config:
        env_file = ".env"


settings = Settings()
