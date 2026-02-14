from datetime import datetime, timezone

from fastapi import APIRouter, Depends

from app.api.deps import get_domain_registry
from app.config import Settings, get_settings
from app.domains.registry import DomainRegistry

router = APIRouter(tags=["health"])


@router.get("/internal/health")
async def internal_health(settings: Settings = Depends(get_settings)) -> dict:
    return {
        "service": settings.app_name,
        "status": "UP",
        "timestamp": datetime.now(timezone.utc).isoformat(),
    }


@router.get("/internal/domains")
async def list_domains(
    registry: DomainRegistry = Depends(get_domain_registry),
) -> dict:
    return {"domains": registry.list_available()}
