from fastapi import APIRouter

from app.api.v1.endpoints import analysis, health, ml

api_v1_router = APIRouter()
api_v1_router.include_router(health.router)
api_v1_router.include_router(analysis.router)
api_v1_router.include_router(ml.router)
