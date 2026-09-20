import os
from dataclasses import dataclass
from pathlib import Path

from dotenv import load_dotenv


def _boolean(name: str, default: bool) -> bool:
    return os.getenv(name, str(default)).lower() in {"1", "true", "yes"}


@dataclass(frozen=True)
class Settings:
    model: str = "silueta"
    device: str = "cpu"
    edge_refinement: str = "auto"
    warm_model: bool = True
    max_upload_mb: int = 12
    max_image_pixels: int = 25_000_000
    max_inference_side: int = 512
    max_batch_size: int = 10
    max_concurrent_inference: int = 1
    batch_retention_seconds: int = 3600
    redis_url: str = "redis://localhost:6379/0"
    database_path: str = "./data/keys.sqlite3"
    batch_directory: str = "./data/batches"
    allowed_origins: str = "http://localhost:3000"
    admin_token: str = ""
    anonymous_rate_per_minute: int = 20
    key_rate_per_minute: int = 120
    key_monthly_quota: int = 10000
    request_timeout_seconds: int = 120

    @classmethod
    def from_env(cls) -> "Settings":
        load_dotenv(Path(__file__).resolve().parent.parent / ".env", override=False)
        values = {}
        for name, field in cls.__dataclass_fields__.items():
            raw = os.getenv(name.upper())
            if raw is None:
                continue
            if field.type is bool or field.type == "bool":
                values[name] = _boolean(name.upper(), getattr(cls, name))
            elif field.type is int or field.type == "int":
                values[name] = int(raw)
            else:
                values[name] = raw
        settings = cls(**values)
        supported_models = {
            "u2net",
            "u2netp",
            "silueta",
            "isnet",
            "birefnet",
            "birefnet-lite",
            "birefnet-portrait",
        }
        if settings.model not in supported_models:
            raise ValueError(
                "MODEL must be u2net, u2netp, silueta, isnet, birefnet, "
                "birefnet-lite, or birefnet-portrait"
            )
        if settings.device not in {"cpu", "gpu"}:
            raise ValueError("DEVICE must be cpu or gpu")
        if settings.edge_refinement not in {"auto", "alpha", "none"}:
            raise ValueError("EDGE_REFINEMENT must be auto, alpha, or none")
        if settings.model in {"u2netp", "silueta"} and settings.edge_refinement == "alpha":
            raise ValueError(f"EDGE_REFINEMENT=alpha is not supported with {settings.model}")
        if settings.max_upload_mb < 1 or settings.max_batch_size < 1:
            raise ValueError("Upload and batch limits must be positive")
        return settings
