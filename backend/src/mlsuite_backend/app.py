"""FastAPI application factory."""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from .config import CORS_ALLOW_ORIGINS
from .routers.artifact import router as artifact_router
from .routers.explain import router as explain_router
from .routers.health import router as health_router
from .routers.metadata import router as metadata_router
from .routers.predict import router as predict_router
from .routers.schema import router as schema_router


def create_app() -> FastAPI:
    app = FastAPI()
    app.add_middleware(
        CORSMiddleware,
        allow_origins=CORS_ALLOW_ORIGINS,
        allow_credentials=True,
        allow_methods=["POST", "GET", "OPTIONS"],
        allow_headers=["*"],
    )
    app.include_router(health_router)
    app.include_router(artifact_router)
    app.include_router(metadata_router)
    app.include_router(schema_router)
    app.include_router(predict_router)
    app.include_router(explain_router)
    return app
