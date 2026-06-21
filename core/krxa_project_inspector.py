
from fastapi import APIRouter, HTTPException
from pathlib import Path
from datetime import datetime
import json
import re

router = APIRouter(prefix="/api/krxa/project", tags=["KRXA Project Inspector"])

ROOT = Path(__file__).resolve().parents[1]
UI = ROOT / "ui"
JS = UI / "js"
STORAGE = ROOT / "storage"
CORE = ROOT / "core"
MAIN = ROOT / "main.py"

SAFE_EXT = {".py", ".html", ".js", ".json", ".txt", ".md", ".yml", ".yaml", ".css"}
BLOCKED = {".git", "__pycache__", ".env", "venv", ".venv", "node_modules"}

def safe_rel(path: Path):
    try:
        return str(path.relative_to(ROOT)).replace("\\", "/")
    except Exception:
        return str(path)

def read_text(path: Path):
    if not path.exists():
        return ""
    return path.read_text(encoding="utf-8", errors="ignore")

def scan_routes():
    text = read_text(MAIN)
    routes = []
    for m in re.finditer(r'@app\.(get|post|put|delete)\("([^"]+)"', text):
        routes.append({"method": m.group(1).upper(), "path": m.group(2), "line": text[:m.start()].count("\n")+1})
    return routes

def scan_files():
    files = []
    for p in ROOT.rglob("*"):
        if any(part in BLOCKED for part in p.parts):
            continue
        if p.is_file() and p.suffix.lower() in SAFE_EXT:
            files.append({
                "path": safe_rel(p),
                "suffix": p.suffix.lower(),
                "size": p.stat().st_size,
                "updated": datetime.fromtimestamp(p.stat().st_mtime).isoformat(timespec="seconds")
            })
    return files

def scan_storage():
    items = []
    if not STORAGE.exists():
        return items
    for p in STORAGE.glob("*.json"):
        try:
            data = json.loads(read_text(p))
            summary = {}
            if isinstance(data, dict):
                summary = {
                    "keys": list(data.keys())[:20],
                    "pages": len(data.get("pages", [])) if isinstance(data.get("pages"), list) else None,
                    "items": len(data.get("items", [])) if isinstance(data.get("items"), list) else None
                }
            items.append({"path": safe_rel(p), "summary": summary})
        except Exception as e:
            items.append({"path": safe_rel(p), "error": str(e)})
    return items

def scan_ui_pages():
    app = read_text(UI / "app.html")
    pages = []
    # 실제 HTML 구조가 달라도 현재 기준으로 page 묶음 추정
    for i in range(1, 21):
        if f"사용자 UI {i}" in app or f"page{i}" in app or f"goPage({i}" in app:
            pages.append({"page": i, "detected": True})
    return pages

def scan_js_functions():
    funcs = []
    for p in JS.glob("*.js"):
        text = read_text(p)
        for m in re.finditer(r'function\s+([A-Za-z0-9_]+)\s*\(', text):
            funcs.append({"file": safe_rel(p), "function": m.group(1), "line": text[:m.start()].count("\n")+1})
        for m in re.finditer(r'([A-Za-z0-9_$.]+)\s*=\s*function\s*\(', text):
            funcs.append({"file": safe_rel(p), "function": m.group(1), "line": text[:m.start()].count("\n")+1})
    return funcs[:500]

def scan_feature_map():
    keywords = {
        "hero": ["hero", "허영만", "백반", "관광지"],
        "hotel": ["hotel", "호텔"],
        "restaurant": ["restaurant", "식당", "맛집", "food"],
        "transport": ["transport", "교통", "택시", "버스", "지하철"],
        "route": ["route", "길찾기", "map", "지도"],
        "m2m": ["m2m", "translate", "stt", "tts", "말대말", "통역"],
        "sos": ["sos", "경찰", "병원", "대사관"]
    }
    files = list(UI.glob("*.html")) + list(JS.glob("*.js")) + list(CORE.glob("*.py")) + [MAIN]
    result = []
    for feature, keys in keywords.items():
        hits = []
        for p in files:
            text = read_text(p)
            low = text.lower()
            for key in keys:
                if key.lower() in low:
                    hits.append(safe_rel(p))
                    break
        result.append({"feature": feature, "files": sorted(set(hits))})
    return result

@router.get("/summary")
def project_summary():
    routes = scan_routes()
    files = scan_files()
    storage = scan_storage()
    features = scan_feature_map()
    return {
        "ok": True,
        "project": "KRXA_LOCAL_FULLSET",
        "time": datetime.now().isoformat(timespec="seconds"),
        "root": str(ROOT),
        "counts": {
            "routes": len(routes),
            "files": len(files),
            "storage_json": len(storage),
            "features": len(features)
        },
        "routes": routes[:300],
        "storage": storage,
        "features": features
    }

@router.get("/files")
def project_files():
    return {"ok": True, "files": scan_files()}

@router.get("/routes")
def project_routes():
    return {"ok": True, "routes": scan_routes()}

@router.get("/storage")
def project_storage():
    return {"ok": True, "storage": scan_storage()}

@router.get("/functions")
def project_functions():
    return {"ok": True, "functions": scan_js_functions()}

@router.get("/feature-map")
def project_feature_map():
    return {"ok": True, "features": scan_feature_map()}

@router.get("/read")
def project_read(path: str):
    target = (ROOT / path).resolve()
    if not str(target).startswith(str(ROOT)):
        raise HTTPException(status_code=403, detail="Blocked path")
    if any(part in BLOCKED for part in target.parts):
        raise HTTPException(status_code=403, detail="Blocked directory")
    if not target.exists():
        raise HTTPException(status_code=404, detail="File not found")
    if target.suffix.lower() not in SAFE_EXT:
        raise HTTPException(status_code=403, detail="File type not allowed")
    return {"ok": True, "path": path, "content": read_text(target)}
