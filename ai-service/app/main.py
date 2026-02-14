from contextlib import asynccontextmanager
from datetime import datetime, timezone
from typing import AsyncIterator

import structlog
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from fastapi import Request
from fastapi.responses import JSONResponse

from app.api.v1.router import api_v1_router
from app.config import get_settings
from app.core.exceptions import (
    AIServiceError,
    DomainNotSupportedException,
    LLMProviderError,
    SessionNotFoundException,
)

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

    @app.exception_handler(DomainNotSupportedException)
    async def domain_not_supported(_: Request, exc: DomainNotSupportedException) -> JSONResponse:
        return JSONResponse(status_code=400, content={"detail": str(exc)})

    @app.exception_handler(SessionNotFoundException)
    async def session_not_found(_: Request, exc: SessionNotFoundException) -> JSONResponse:
        return JSONResponse(status_code=404, content={"detail": str(exc)})

    @app.exception_handler(LLMProviderError)
    async def llm_error(_: Request, exc: LLMProviderError) -> JSONResponse:
        logger.error("llm_provider_error", error=str(exc))
        return JSONResponse(status_code=502, content={"detail": "AI service temporarily unavailable"})

    @app.exception_handler(AIServiceError)
    async def ai_service_error(_: Request, exc: AIServiceError) -> JSONResponse:
        return JSONResponse(status_code=500, content={"detail": str(exc)})

    @app.get("/health", tags=["health"])
    async def health() -> dict[str, str]:
        return {
            "service": settings.app_name,
            "status": "UP",
            "timestamp": datetime.now(timezone.utc).isoformat(),
        }

    return app


app = create_app()
