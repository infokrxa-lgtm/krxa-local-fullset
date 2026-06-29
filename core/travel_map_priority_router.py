
from __future__ import annotations
from fastapi import APIRouter, Body
from typing import Dict, Any
from .travel_map_priority import status, providers, direction_urls, save_provider, delete_provider, save_country_profile

router = APIRouter(prefix="/api/travel-v2/map-priority", tags=["Travel V2 Map Priority"])

@router.get("/status")
def api_status():
    return status()

@router.get("/providers")
def api_providers(country_code: str = "KR"):
    return providers(country_code)

@router.get("/direction-url")
def api_direction_url(country_code: str = "KR", start_lat: str = "", start_lng: str = "", dest_lat: str = "", dest_lng: str = "", dest_name: str = "목적지"):
    return direction_urls(country_code, start_lat, start_lng, dest_lat, dest_lng, dest_name)

@router.post("/providers/save")
def api_save_provider(provider: Dict[str, Any] = Body(...)):
    return save_provider(provider)

@router.post("/providers/delete")
def api_delete_provider(payload: Dict[str, Any] = Body(...)):
    return delete_provider(payload.get("id") or payload.get("provider_id") or "")

@router.post("/country-profile/save")
def api_save_country_profile(profile: Dict[str, Any] = Body(...)):
    return save_country_profile(profile)
