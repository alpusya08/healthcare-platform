from __future__ import annotations

from typing import AsyncGenerator

import structlog
from fastapi import Depends, Header, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import Settings, get_settings
from app.core.interfaces.llm_provider import LLMProvider
from app.core.interfaces.ml_predictor import MLPredictor
from app.core.interfaces.session_repository import AnalysisSessionRepository
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


async def get_db_session(
    settings: Settings = Depends(get_settings),
) -> AsyncGenerator[AsyncSession, None]:
    from app.infrastructure.db.session import get_session_factory
    factory = get_session_factory()
    async with factory() as session:
        yield session


def _create_llm_provider(settings: Settings) -> LLMProvider:
    try:
        from app.infrastructure.llm.factory import create_llm_provider
        return create_llm_provider(settings)
    except ValueError as e:
        logger.warning("llm_provider_not_configured", error=str(e), fallback="mock")
        from app.infrastructure.llm.mock_llm import MockLLMProvider
        return MockLLMProvider()


def _create_triage_predictor(settings: Settings) -> MLPredictor | None:
    if settings.ai_mode == "claude_only":
        logger.info("triage_predictor.skipped", reason="ai_mode=claude_only")
        return None
    try:
        import mlflow
        from app.infrastructure.ml.predictors.triage_predictor import MLflowTriagePredictor

        mlflow.set_tracking_uri(settings.mlflow_tracking_uri)
        model_uri = f"models:/{settings.mlflow_model_name}@{settings.mlflow_model_alias}"
        return MLflowTriagePredictor(model_uri=model_uri, version=settings.mlflow_model_alias)
    except Exception as e:
        logger.warning("triage_predictor_not_loaded", error=str(e))
        return None


def _create_diagnosis_predictors(settings: Settings) -> dict:
    """Load one DomainDiagnosisPredictor per supported domain (best-effort)."""
    if settings.ai_mode == "claude_only":
        logger.info("diagnosis_predictors.skipped", reason="ai_mode=claude_only")
        return {}

    predictors: dict = {}
    try:
        import mlflow
        from app.infrastructure.ml.predictors.diagnosis_predictor import DomainDiagnosisPredictor
        from app.ml.diagnosis.registry import DOMAIN_REGISTRY

        mlflow.set_tracking_uri(settings.mlflow_tracking_uri)
        alias = settings.mlflow_model_alias

        for code, domain_cfg in DOMAIN_REGISTRY.items():
            try:
                model_uri = f"models:/{domain_cfg.model_name}@{alias}"
                predictors[code] = DomainDiagnosisPredictor.from_mlflow(
                    domain_code=code, model_uri=model_uri, version=alias,
                )
            except Exception as e:
                logger.warning("diagnosis_predictor.load_failed", domain=code, error=str(e))
    except Exception as e:
        logger.warning("diagnosis_predictors.init_failed", error=str(e))

    logger.info("diagnosis_predictors.loaded", domains=list(predictors.keys()))
    return predictors


_llm_provider: LLMProvider | None = None


def get_llm_provider(settings: Settings = Depends(get_settings)) -> LLMProvider:
    global _llm_provider
    if _llm_provider is None:
        _llm_provider = _create_llm_provider(settings)
    return _llm_provider


def get_domain_registry(settings: Settings = Depends(get_settings)) -> DomainRegistry:
    global _domain_registry
    if _domain_registry is None:
        llm = _create_llm_provider(settings)
        predictor = _create_triage_predictor(settings)
        diagnosis_predictors = _create_diagnosis_predictors(settings)
        _domain_registry = DomainRegistry()
        _domain_registry.register(
            GeneralSymptomDomain(
                llm=llm,
                predictor=predictor,
                diagnosis_predictors=diagnosis_predictors,
            )
        )
        logger.info(
            "domain_registry.initialized",
            llm=type(llm).__name__,
            predictor=type(predictor).__name__ if predictor else "none",
            diagnosis_domains=list(diagnosis_predictors.keys()),
            ai_mode=settings.ai_mode,
        )
    return _domain_registry


def verify_internal_token(
    x_service_token: str = Header(...),
    settings: Settings = Depends(get_settings),
) -> None:
    if x_service_token != settings.backend_internal_token:
        raise HTTPException(status_code=403, detail="Invalid service token")
