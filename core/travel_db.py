
from __future__ import annotations
import sqlite3, json
from pathlib import Path
from datetime import datetime
from typing import Any, Dict, List, Optional

ROOT = Path(__file__).resolve().parents[1]
STORAGE = ROOT / "storage"
DATA = ROOT / "data"
DB_PATH = STORAGE / "travel_v1.db"

def now_iso() -> str:
    return datetime.now().isoformat(timespec="seconds")

def conn():
    STORAGE.mkdir(exist_ok=True)
    c = sqlite3.connect(DB_PATH)
    c.row_factory = sqlite3.Row
    return c

def init_db() -> None:
    with conn() as c:
        c.execute("CREATE TABLE IF NOT EXISTS travel_sources (id TEXT PRIMARY KEY, name TEXT NOT NULL, type TEXT NOT NULL, region_scope TEXT DEFAULT '', region TEXT DEFAULT '', city TEXT DEFAULT '', url TEXT DEFAULT '', enabled INTEGER DEFAULT 1, approved INTEGER DEFAULT 1, priority INTEGER DEFAULT 999, refresh_rule TEXT DEFAULT 'manual', verification_status TEXT DEFAULT '', created_at TEXT DEFAULT '', updated_at TEXT DEFAULT '')")
        c.execute("CREATE TABLE IF NOT EXISTS travel_places (id TEXT PRIMARY KEY, name TEXT NOT NULL, category TEXT NOT NULL, country TEXT DEFAULT 'KR', region TEXT DEFAULT '', city TEXT DEFAULT '', district TEXT DEFAULT '', address TEXT DEFAULT '', lat REAL, lng REAL, phone TEXT DEFAULT '', official_url TEXT DEFAULT '', map_query TEXT DEFAULT '', source_id TEXT DEFAULT '', source_type TEXT DEFAULT '', tags_json TEXT DEFAULT '[]', enabled INTEGER DEFAULT 1, approved INTEGER DEFAULT 1, priority INTEGER DEFAULT 999, updated_at TEXT DEFAULT '')")
        c.execute("CREATE TABLE IF NOT EXISTS travel_festivals (id TEXT PRIMARY KEY, name TEXT NOT NULL, region TEXT DEFAULT '', city TEXT DEFAULT '', district TEXT DEFAULT '', start_date TEXT DEFAULT '', end_date TEXT DEFAULT '', is_active INTEGER DEFAULT 0, venue TEXT DEFAULT '', host TEXT DEFAULT '', official_url TEXT DEFAULT '', phone TEXT DEFAULT '', lat REAL, lng REAL, parking_info TEXT DEFAULT '', transit_info TEXT DEFAULT '', source_id TEXT DEFAULT '', enabled INTEGER DEFAULT 1, approved INTEGER DEFAULT 1, priority INTEGER DEFAULT 999, updated_at TEXT DEFAULT '')")
        c.execute("CREATE TABLE IF NOT EXISTS travel_source_update_logs (id INTEGER PRIMARY KEY AUTOINCREMENT, action TEXT NOT NULL, target_id TEXT DEFAULT '', status TEXT DEFAULT '', detail_json TEXT DEFAULT '{}', created_at TEXT DEFAULT '')")
        c.execute("CREATE TABLE IF NOT EXISTS travel_user_sources (id TEXT PRIMARY KEY, name TEXT NOT NULL, type TEXT DEFAULT 'user', url TEXT DEFAULT '', region TEXT DEFAULT '', memo TEXT DEFAULT '', enabled INTEGER DEFAULT 1, approved INTEGER DEFAULT 0, created_at TEXT DEFAULT '', updated_at TEXT DEFAULT '')")

def upsert_source(item: Dict[str, Any]) -> None:
    init_db()
    ts = now_iso()
    with conn() as c:
        c.execute("""INSERT INTO travel_sources
        (id,name,type,region_scope,region,city,url,enabled,approved,priority,refresh_rule,verification_status,created_at,updated_at)
        VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?)
        ON CONFLICT(id) DO UPDATE SET
          name=excluded.name,type=excluded.type,region_scope=excluded.region_scope,region=excluded.region,city=excluded.city,
          url=excluded.url,enabled=excluded.enabled,approved=excluded.approved,priority=excluded.priority,
          refresh_rule=excluded.refresh_rule,verification_status=excluded.verification_status,updated_at=excluded.updated_at""", (
            item.get("id"), item.get("name"), item.get("type","official"), item.get("region_scope",""),
            item.get("region",""), item.get("city",""), item.get("url",""), int(bool(item.get("enabled", True))),
            int(bool(item.get("approved", True))), int(item.get("priority", 999)), item.get("refresh_rule","manual"),
            item.get("verification_status",""), item.get("created_at", ts), ts
        ))

def seed_sources(seed_path: Optional[Path] = None) -> Dict[str, Any]:
    init_db()
    if seed_path is None:
        seed_path = DATA / "travel_v1_korea_tour_sources_seed_v1.json"
    if not seed_path.exists():
        return {"ok": False, "error": f"seed not found: {seed_path}", "count": 0}
    data = json.loads(seed_path.read_text(encoding="utf-8"))
    sources = data.get("sources", [])
    for item in sources:
        upsert_source(item)
    log("seed_sources", "travel_sources", "ok", {"count": len(sources), "seed": str(seed_path)})
    return {"ok": True, "count": len(sources)}

def list_sources(enabled: Optional[bool] = None, approved: Optional[bool] = None) -> List[Dict[str, Any]]:
    init_db()
    where, params = [], []
    if enabled is not None:
        where.append("enabled=?"); params.append(int(enabled))
    if approved is not None:
        where.append("approved=?"); params.append(int(approved))
    sql = "SELECT * FROM travel_sources"
    if where:
        sql += " WHERE " + " AND ".join(where)
    sql += " ORDER BY priority ASC, region ASC, name ASC"
    with conn() as c:
        return [dict(r) for r in c.execute(sql, params).fetchall()]

def set_source_state(source_id: str, enabled: Optional[bool] = None, approved: Optional[bool] = None) -> Dict[str, Any]:
    init_db()
    sets, params = [], []
    if enabled is not None:
        sets.append("enabled=?"); params.append(int(enabled))
    if approved is not None:
        sets.append("approved=?"); params.append(int(approved))
    if not sets:
        return {"ok": False, "error": "no state provided"}
    sets.append("updated_at=?"); params.append(now_iso())
    params.append(source_id)
    with conn() as c:
        cur = c.execute(f"UPDATE travel_sources SET {', '.join(sets)} WHERE id=?", params)
    return {"ok": True, "updated": cur.rowcount, "id": source_id}

def delete_source(source_id: str) -> Dict[str, Any]:
    init_db()
    with conn() as c:
        cur = c.execute("DELETE FROM travel_sources WHERE id=?", (source_id,))
    return {"ok": True, "deleted": cur.rowcount, "id": source_id}

def upsert_user_source(item: Dict[str, Any]) -> Dict[str, Any]:
    init_db()
    ts = now_iso()
    sid = item.get("id") or ("user_" + str(abs(hash((item.get("name",""), item.get("url",""))))))
    with conn() as c:
        c.execute("""INSERT INTO travel_user_sources
        (id,name,type,url,region,memo,enabled,approved,created_at,updated_at)
        VALUES (?,?,?,?,?,?,?,?,?,?)
        ON CONFLICT(id) DO UPDATE SET name=excluded.name,url=excluded.url,region=excluded.region,memo=excluded.memo,enabled=excluded.enabled,approved=excluded.approved,updated_at=excluded.updated_at""", (
            sid, item.get("name",""), item.get("type","user"), item.get("url",""), item.get("region",""),
            item.get("memo",""), int(bool(item.get("enabled", True))), int(bool(item.get("approved", False))), item.get("created_at", ts), ts
        ))
    return {"ok": True, "id": sid}

def list_festivals(active_only: bool = False) -> List[Dict[str, Any]]:
    init_db()
    sql = "SELECT * FROM travel_festivals"
    if active_only:
        sql += " WHERE enabled=1 AND approved=1 AND is_active=1"
    sql += " ORDER BY priority ASC, start_date DESC, name ASC"
    with conn() as c:
        return [dict(r) for r in c.execute(sql).fetchall()]

def search_places(category: str = "", region: str = "", q: str = "") -> List[Dict[str, Any]]:
    init_db()
    where = ["enabled=1", "approved=1"]
    params = []
    if category:
        where.append("category=?"); params.append(category)
    if region:
        where.append("region=?"); params.append(region)
    if q:
        where.append("(name LIKE ? OR address LIKE ? OR tags_json LIKE ?)")
        params.extend([f"%{q}%", f"%{q}%", f"%{q}%"])
    sql = "SELECT * FROM travel_places WHERE " + " AND ".join(where) + " ORDER BY priority ASC, name ASC LIMIT 100"
    with conn() as c:
        return [dict(r) for r in c.execute(sql, params).fetchall()]

def log(action: str, target_id: str = "", status: str = "", detail: Any = None) -> None:
    init_db()
    with conn() as c:
        c.execute("INSERT INTO travel_source_update_logs(action,target_id,status,detail_json,created_at) VALUES (?,?,?,?,?)", (action, target_id, status, json.dumps(detail or {}, ensure_ascii=False), now_iso()))

def status() -> Dict[str, Any]:
    init_db()
    with conn() as c:
        return {
            "db_path": str(DB_PATH),
            "sources": c.execute("SELECT COUNT(*) FROM travel_sources").fetchone()[0],
            "places": c.execute("SELECT COUNT(*) FROM travel_places").fetchone()[0],
            "festivals": c.execute("SELECT COUNT(*) FROM travel_festivals").fetchone()[0],
            "user_sources": c.execute("SELECT COUNT(*) FROM travel_user_sources").fetchone()[0],
        }
