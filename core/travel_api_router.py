
from __future__ import annotations
from fastapi import APIRouter, Body, Query
from pathlib import Path
import json
from . import travel_db
from .travel_auto_updater import run_update
from .travel_map import build_map_bundle

router = APIRouter(prefix="/api/travel-v1", tags=["Travel V1"])
ROOT = Path(__file__).resolve().parents[1]
STORAGE = ROOT / "storage"

def load_json(path: Path, default):
    if path.exists():
        return json.loads(path.read_text(encoding="utf-8"))
    return default

@router.get("/status")
def travel_v1_status():
    travel_db.init_db()
    return {"ok": True, **travel_db.status()}

@router.post("/db/init")
def travel_v1_db_init():
    travel_db.init_db()
    seed = travel_db.seed_sources()
    return {"ok": True, "seed": seed, "status": travel_db.status()}

@router.post("/db/update/run")
def travel_v1_db_update_run(mode: str = "manual"):
    return run_update(mode=mode)

@router.get("/sources")
def travel_v1_sources(enabled: bool | None = None, approved: bool | None = None):
    return {"ok": True, "sources": travel_db.list_sources(enabled=enabled, approved=approved)}

@router.post("/sources/save")
def travel_v1_source_save(item: dict = Body(...)):
    travel_db.upsert_source(item)
    return {"ok": True, "source": item}

@router.post("/sources/state")
def travel_v1_source_state(payload: dict = Body(...)):
    return travel_db.set_source_state(payload.get("id",""), payload.get("enabled"), payload.get("approved"))

@router.post("/sources/delete")
def travel_v1_source_delete(payload: dict = Body(...)):
    return travel_db.delete_source(payload.get("id",""))

@router.post("/user-sources/save")
def travel_v1_user_source_save(item: dict = Body(...)):
    return travel_db.upsert_user_source(item)

@router.get("/user-ui-reflection")
def travel_v1_user_ui_reflection():
    data = load_json(STORAGE / "travel_v1_user_ui_reflection.json", {"user_ui": {}})
    readonly = load_json(STORAGE / "travel_v1_control_to_user_readonly_binding.json", {})
    return {"ok": True, "reflection": data, "readonly_binding": readonly}

@router.get("/places/search")
def travel_v1_places_search(category: str = "", region: str = "", q: str = ""):
    rows = travel_db.search_places(category=category, region=region, q=q)
    for r in rows:
        r["maps"] = build_map_bundle(r.get("name",""), r.get("address",""))
    return {"ok": True, "places": rows}

@router.get("/festivals")
def travel_v1_festivals(active_only: bool = False):
    rows = travel_db.list_festivals(active_only=active_only)
    for r in rows:
        r["maps"] = build_map_bundle(r.get("name",""), r.get("venue",""))
    return {"ok": True, "festivals": rows}

@router.get("/map-url")
def travel_v1_map_url(name: str = Query(""), address: str = Query("")):
    return {"ok": True, "maps": build_map_bundle(name, address)}

@router.get("/m2m-boundary")
def travel_v1_m2m_boundary():
    return {"ok": True, "boundary": load_json(STORAGE / "travel_v1_m2m_call_boundary_state.json", {})}
