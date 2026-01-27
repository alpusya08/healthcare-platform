from fastapi import APIRouter

api_v1_router = APIRouter()


@api_v1_router.get("/internal/health", tags=["internal"])
async def internal_health() -> dict[str, str]:
    return {"status": "UP"}
