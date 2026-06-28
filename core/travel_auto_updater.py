
from __future__ import annotations
from datetime import datetime
from typing import Dict, Any
from . import travel_db

def run_update(mode: str = "manual") -> Dict[str, Any]:
    travel_db.init_db()
    seed_result = travel_db.seed_sources()
    travel_db.log("auto_update", "travel_v1", "ok", {"mode": mode, "seed_result": seed_result})
    return {
        "ok": True,
        "mode": mode,
        "time": datetime.now().isoformat(timespec="seconds"),
        "seed_result": seed_result,
        "status": travel_db.status(),
        "next": ["TourAPI key 연결", "시군구 관광 사이트 seed 확장", "축제/맛집/숙박/병원/교통 수집기 추가"]
    }
