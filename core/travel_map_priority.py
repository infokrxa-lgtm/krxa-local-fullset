
from __future__ import annotations
from pathlib import Path
from typing import Dict, Any
from urllib.parse import quote
import json

ROOT = Path(__file__).resolve().parents[1]
DATA = ROOT / "data"
STORAGE = ROOT / "storage"
SEED = DATA / "travel_v2_map_priority_seed_v1.json"
CONFIG = STORAGE / "travel_v2_map_priority_config.json"

def _load_seed() -> Dict[str, Any]:
    if SEED.exists():
        return json.loads(SEED.read_text(encoding="utf-8"))
    return {"providers": [], "country_profiles": []}

def _load_config() -> Dict[str, Any]:
    STORAGE.mkdir(exist_ok=True)
    if CONFIG.exists():
        return json.loads(CONFIG.read_text(encoding="utf-8"))
    data = _load_seed()
    CONFIG.write_text(json.dumps(data, ensure_ascii=False, indent=2), encoding="utf-8")
    return data

def _save_config(data: Dict[str, Any]) -> Dict[str, Any]:
    STORAGE.mkdir(exist_ok=True)
    CONFIG.write_text(json.dumps(data, ensure_ascii=False, indent=2), encoding="utf-8")
    return data

def status() -> Dict[str, Any]:
    data = _load_config()
    return {
        "ok": True,
        "providers": len(data.get("providers", [])),
        "country_profiles": len(data.get("country_profiles", [])),
        "config_path": str(CONFIG)
    }

def providers(country_code: str = "KR") -> Dict[str, Any]:
    data = _load_config()
    cc = (country_code or "KR").upper()
    all_providers = [p for p in data.get("providers", []) if p.get("enabled", True)]

    profile = next((p for p in data.get("country_profiles", []) if p.get("country_code") == cc), None)
    if not profile:
        profile = next((p for p in data.get("country_profiles", []) if p.get("country_code") == "GLOBAL"), {"provider_order":["google_web"]})

    order = profile.get("provider_order", ["google_web"])
    ordered = []
    for pid in order:
        found = next((p for p in all_providers if p.get("id") == pid), None)
        if found:
            ordered.append(found)

    if not ordered:
        found = next((p for p in all_providers if p.get("id") == "google_web"), None)
        if found:
            ordered.append(found)

    return {"ok": True, "country_code": cc, "profile": profile, "providers": ordered}

def _fill_template(tpl: str, start_lat: str, start_lng: str, dest_lat: str, dest_lng: str, dest_name: str) -> str:
    values = {
        "start_lat": quote(str(start_lat or "")),
        "start_lng": quote(str(start_lng or "")),
        "dest_lat": quote(str(dest_lat or "")),
        "dest_lng": quote(str(dest_lng or "")),
        "dest_name": quote(str(dest_name or "목적지")),
    }
    return tpl.format(**values)

def direction_urls(country_code: str = "KR", start_lat: str = "", start_lng: str = "", dest_lat: str = "", dest_lng: str = "", dest_name: str = "목적지") -> Dict[str, Any]:
    ps = providers(country_code).get("providers", [])
    urls = []
    for p in ps:
        tpl = p.get("url_template") or ""
        try:
            urls.append({
                "provider_id": p.get("id"),
                "name": p.get("name"),
                "priority": p.get("priority", 999),
                "url": _fill_template(tpl, start_lat, start_lng, dest_lat, dest_lng, dest_name),
                "type": p.get("type", "web")
            })
        except Exception as e:
            urls.append({"provider_id": p.get("id"), "name": p.get("name"), "error": str(e)})
    return {
        "ok": True,
        "country_code": (country_code or "KR").upper(),
        "start": {"lat": start_lat, "lng": start_lng},
        "destination": {"lat": dest_lat, "lng": dest_lng, "name": dest_name},
        "urls": urls
    }

def save_provider(provider: Dict[str, Any]) -> Dict[str, Any]:
    data = _load_config()
    pid = provider.get("id")
    if not pid:
        return {"ok": False, "error": "provider.id required"}
    arr = data.setdefault("providers", [])
    for i, p in enumerate(arr):
        if p.get("id") == pid:
            arr[i] = {**p, **provider}
            _save_config(data)
            return {"ok": True, "action": "updated", "provider": arr[i]}
    arr.append(provider)
    _save_config(data)
    return {"ok": True, "action": "created", "provider": provider}

def delete_provider(provider_id: str) -> Dict[str, Any]:
    data = _load_config()
    before = len(data.get("providers", []))
    data["providers"] = [p for p in data.get("providers", []) if p.get("id") != provider_id]
    _save_config(data)
    return {"ok": True, "deleted": before - len(data["providers"]), "provider_id": provider_id}

def save_country_profile(profile: Dict[str, Any]) -> Dict[str, Any]:
    data = _load_config()
    cc = (profile.get("country_code") or "").upper()
    if not cc:
        return {"ok": False, "error": "country_code required"}
    profile["country_code"] = cc
    arr = data.setdefault("country_profiles", [])
    for i, p in enumerate(arr):
        if p.get("country_code") == cc:
            arr[i] = {**p, **profile}
            _save_config(data)
            return {"ok": True, "action": "updated", "profile": arr[i]}
    arr.append(profile)
    _save_config(data)
    return {"ok": True, "action": "created", "profile": profile}
