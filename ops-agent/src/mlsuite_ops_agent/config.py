"""Environment-backed settings."""

from dataclasses import dataclass
import os


def _env(name: str, default: str) -> str:
    value = os.getenv(name)
    return value.strip() if value and value.strip() else default


def _env_list(name: str, default: str) -> tuple[str, ...]:
    raw = _env(name, default)
    return tuple(item.strip() for item in raw.split(",") if item.strip())


@dataclass(frozen=True)
class Settings:
    host: str = _env("OPS_AGENT_HOST", "127.0.0.1")
    port: int = int(_env("OPS_AGENT_PORT", "8091"))
    shared_secret: str = _env("OPS_AGENT_SHARED_SECRET", "mlsuite-dev-secret")
    compose_file: str = _env("OPS_AGENT_COMPOSE_FILE", "docker-compose.dev.yml")
    compose_project: str = _env("OPS_AGENT_COMPOSE_PROJECT", "")
    docker_bin: str = _env("OPS_AGENT_DOCKER_BIN", "docker")
    managed_services: tuple[str, ...] = _env_list(
        "OPS_AGENT_MANAGED_SERVICES",
        "postgres,py-analyzer,minio,spring-app,frontend",
    )
    sample_interval_seconds: int = int(_env("OPS_AGENT_SAMPLE_INTERVAL_SECONDS", "5"))
    retention_minutes: int = int(_env("OPS_AGENT_RETENTION_MINUTES", "60"))
    terminal_idle_minutes: int = int(_env("OPS_AGENT_TERMINAL_IDLE_MINUTES", "15"))
    terminal_max_sessions: int = int(_env("OPS_AGENT_TERMINAL_MAX_SESSIONS", "10"))
    log_tail_lines: int = int(_env("OPS_AGENT_LOG_TAIL_LINES", "200"))


SETTINGS = Settings()
