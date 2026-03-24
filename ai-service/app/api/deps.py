from __future__ import annotations

import structlog
from fastapi import Depends, Header, HTTPException

from app.config import Settings, get_settings
from app.core.interfaces.llm_provider import LLMProvider
from app.core.interfaces.ml_predictor import MLPredictor
from app.core.interfaces.session_repository import AnalysisSessionRepository
from app.domains.cardiology.domain import CardiologyDomain
from app.domains.general.domain import GeneralSymptomDomain
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


def _create_llm_provider(settings: Settings) -> LLMProvider:
    try:
        from app.infrastructure.llm.factory import create_llm_provider
        return create_llm_provider(settings)
    except ValueError as e:
        logger.warning("llm_provider_not_configured", error=str(e), fallback="mock")
        from app.infrastructure.llm.mock_llm import MockLLMProvider
        return MockLLMProvider()


def _create_ml_predictor(settings: Settings) -> MLPredictor | None:
    try:
        import mlflow
        from app.infrastructure.ml.predictors.cardiology_predictor import MLflowCardiologyPredictor

        mlflow.set_tracking_uri(settings.mlflow_tracking_uri)
        model_uri = f"models:/{settings.mlflow_model_name}@{settings.mlflow_model_alias}"
        return MLflowCardiologyPredictor(model_uri=model_uri, version=settings.mlflow_model_alias)
    except Exception as e:
        logger.warning("ml_predictor_not_loaded", error=str(e))
        return None


def get_domain_registry(settings: Settings = Depends(get_settings)) -> DomainRegistry:
    global _domain_registry
    if _domain_registry is None:
        llm = _create_llm_provider(settings)
        predictor = _create_ml_predictor(settings)
        _domain_registry = DomainRegistry()
        _domain_registry.register(CardiologyDomain(llm=llm, predictor=predictor))
        _domain_registry.register(GeneralSymptomDomain(llm=llm))
        logger.info(
            "domain_registry.initialized",
            llm=type(llm).__name__,
            predictor=type(predictor).__name__ if predictor else "none",
        )
    return _domain_registry


def verify_internal_token(
    x_service_token: str = Header(...),
    settings: Settings = Depends(get_settings),
) -> None:
    if x_service_token != settings.backend_internal_token:
        raise HTTPException(status_code=403, detail="Invalid service token")
