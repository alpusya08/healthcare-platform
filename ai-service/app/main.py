from contextlib import asynccontextmanager
from datetime import datetime, timezone
from typing import AsyncIterator

import structlog
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.v1.router import api_v1_router
from app.config import get_settings

logger = structlog.get_logger()


@asynccontextmanager
async def lifespan(_app: FastAPI) -> AsyncIterator[None]:
    settings = get_settings()
    logger.info("ai_service.startup", environment=settings.environment, llm=settings.llm_provider)
    yield
    logger.info("ai_service.shutdown")


def create_app() -> FastAPI:
    settings = get_settings()
    app = FastAPI(
        title="Healthcare AI Service",
        version="0.0.1",
        description="Domain-agnostic AI engine for medical diagnostics (MVP: Cardiology).",
        lifespan=lifespan,
    )

    app.add_middleware(
        CORSMiddleware,
        allow_origins=[o.strip() for o in settings.cors_allowed_origins.split(",")],
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    app.include_router(api_v1_router, prefix="/api/v1")

    @app.get("/health", tags=["health"])
    async def health() -> dict[str, str]:
        return {
            "service": settings.app_name,
            "status": "UP",
            "timestamp": datetime.now(timezone.utc).isoformat(),
        }

    return app


app = create_app()
