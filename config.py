import os
import secrets
import warnings
from datetime import timedelta
from pathlib import Path

from dotenv import load_dotenv

PROJECT_ROOT = Path(__file__).resolve().parent
load_dotenv(PROJECT_ROOT / ".env")


def _as_bool(name: str, default: bool) -> bool:
    value = os.getenv(name)
    if value is None:
        return default
    return value.strip().lower() in {"1", "true", "yes", "on"}


class Config:
    SECRET_KEY = os.getenv("SECRET_KEY")
    ENVIRONMENT = os.getenv("FLASK_ENV", "development").strip().lower()
    if not SECRET_KEY:
        if ENVIRONMENT in {"production", "prod"}:
            raise RuntimeError("SECRET_KEY must be configured in production.")
        SECRET_KEY = secrets.token_urlsafe(48)
        warnings.warn(
            "SECRET_KEY is not configured; a temporary key is being used. "
            "Set SECRET_KEY in .env so sessions remain valid after restart.",
            RuntimeWarning,
        )

    SQLALCHEMY_DATABASE_URI = os.getenv(
        "DATABASE_URL", "sqlite:///reattempt_dev.db"
    )
    SQLALCHEMY_TRACK_MODIFICATIONS = False
    SQLALCHEMY_ENGINE_OPTIONS = {"pool_pre_ping": True}
    SESSION_COOKIE_HTTPONLY = True
    SESSION_COOKIE_SECURE = _as_bool("COOKIE_SECURE", False)
    SESSION_COOKIE_SAMESITE = "Lax"
    SESSION_COOKIE_NAME = "reattempt_session"
    PERMANENT_SESSION_LIFETIME = timedelta(
        hours=max(1, int(os.getenv("SESSION_HOURS", "2")))
    )
    SESSION_REFRESH_EACH_REQUEST = True
    WTF_CSRF_TIME_LIMIT = 3600
    MAX_CONTENT_LENGTH = 128 * 1024
    JSON_SORT_KEYS = False
    DEBUG = _as_bool("FLASK_DEBUG", False)
    if ENVIRONMENT in {"production", "prod"}:
        DEBUG = False
