from __future__ import annotations

import structlog
from fastapi import Depends, Header, HTTPException

from app.config import Settings, get_settings
from app.core.interfaces.llm_provider import LLMProvider
from app.core.interfaces.session_repository import AnalysisSessionRepository
from app.domains.cardiology.domain import CardiologyDomain
from app.domains.registry import DomainRegistry
from app.infrastructure.persistence.in_memory_session_repo import InMemorySessionRepository

logger = structlog.get_logger()

_session_repo: InMemorySessionRepository | None = None
_domain_registry: DomainRegistry | None = None


def get_session_repo() -> AnalysisSessionRepository:
    global _session_repo
    if _session_repo is None:
        _session_repo = InMemorySessionRepository()
    return _session_repo


def _create_llm_provider(settings: Settings) -> LLMProvider | None:
    try:
        from app.infrastructure.llm.factory import create_llm_provider
        return create_llm_provider(settings)
    except ValueError as e:
        logger.warning("llm_provider_not_configured", error=str(e))
        return None


def get_domain_registry(settings: Settings = Depends(get_settings)) -> DomainRegistry:
    global _domain_registry
    if _domain_registry is None:
        llm = _create_llm_provider(settings)
        _domain_registry = DomainRegistry()
        if llm:
            _domain_registry.register(CardiologyDomain(llm=llm))
        else:
            logger.warning("no_llm_provider", message="Cardiology domain not registered — no LLM API key")
    return _domain_registry


def verify_internal_token(
    x_service_token: str = Header(...),
    settings: Settings = Depends(get_settings),
) -> None:
    if x_service_token != settings.backend_internal_token:
        raise HTTPException(status_code=403, detail="Invalid service token")
