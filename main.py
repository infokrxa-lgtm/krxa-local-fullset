from pathlib import Path
import html
import json
import os
import shutil

from core.krxa_ai_gate import router as krxa_ai_gate_router
from core.krxa_project_inspector import router as krxa_project_inspector_router
from fastapi import FastAPI, Form, UploadFile, File, Request
from fastapi.staticfiles import StaticFiles
from fastapi.responses import HTMLResponse, RedirectResponse, FileResponse

from core.krxa_router import route_turn
from core.krxa_translate import translate_only
from core.krxa_store import (
    clear_history,
    load_history,
    load_logs,
    stats,
    log_event,
    load_config,
    save_config,
    read_json,
    write_json
)
from core.krxa_voice import stt_with_detail, tts_response
from core.krxa_learning import analyze_stt_logs, apply_learning_to_config
from core.krxa_autoloop import analyze_logs_for_candidates, load_candidates
from core.krxa_links import (
    list_categories,
    add_user_link,
    delete_user_link,
    all_links_for_category
)

app = FastAPI(title="KRXA LOCAL FULLSET REAL")
app.include_router(krxa_project_inspector_router)
app.include_router(krxa_ai_gate_router)
ROOT = Path(".").resolve()

VOICE_FILTER_PATH = "storage/voice_filter_config.json"
TURN_CONFIG_PATH = "storage/turn_config.json"
FLOW_SIGNAL_PATH = "storage/flow_signal_config.json"


def render_template(name: str, **kwargs):
    text = (Path("ui") / name).read_text(encoding="utf-8")
    for key, value in kwargs.items():
        text = text.replace("__" + key.upper() + "__", str(value))
    return text


def safe_path(p: str = ""):
    target = (ROOT / p).resolve()
    if not str(target).startswith(str(ROOT)):
        raise ValueError("invalid path")
    return target


def read_config_file(path, default):
    return read_json(path, default)


def save_config_file(path, data):
    write_json(path, data)
    log_event("control_config_saved", {"path": path, "data": data})
    return data


@app.get("/")
def root():
    return {"ok": True, "version": "KRXA_FLOW_SIGNAL_CONTROL_V1"}


@app.get("/user", response_class=HTMLResponse)
def user():
    return render_template("user.html")


@app.get("/app", response_class=HTMLResponse)
def app_ui(service: str = "free"):
    return render_template("app.html", service=service)


@app.get("/test_voice", response_class=HTMLResponse)
def test_voice():
    return render_template("test_voice.html")


@app.post("/api/translate")
async def api_translate(
    text: str = Form(...),
    service: str = Form("travel"),
    session_id: str = Form(""),
    source: str = Form("text"),
    device_locale: str = Form(""),
    location_text: str = Form(""),
    lat: str = Form(""),
    lng: str = Form(""),
    target_language: str = Form("auto")
):
    from core.krxa_translate import translate_only

    return translate_only(
        text=text,
        session_id=session_id,
        service=service,
        source=source,
        device_locale=device_locale,
        location_text=location_text,
        lat=lat,
        lng=lng,
        target_language=target_language
    )


@app.post("/api/turn")
async def api_turn(
    text: str = Form(...),
    service: str = Form("free"),
    session_id: str = Form(""),
    mode: str = Form("agency"),
    source: str = Form("text"),
    location_text: str = Form(""),
    lat: str = Form(""),
    lng: str = Form(""),
    device_locale: str = Form(""),
    extra_context: str = Form("")
):
    return route_turn(
        text=text,
        service=service,
        session_id=session_id,
        mode=mode,
        source=source,
        location_text=location_text,
        lat=lat,
        lng=lng,
        device_locale=device_locale,
        extra_context=extra_context
    )


@app.post("/chat")
async def chat(
    text: str = Form(...),
    service: str = Form("free"),
    session_id: str = Form(""),
    mode: str = Form("agency")
):
    return route_turn(
        text=text,
        service=service,
        session_id=session_id,
        mode=mode,
        source="chat"
    )


@app.post("/history/clear")
def history_clear(session_id: str = Form(...)):
    clear_history(session_id)
    clear_history(session_id + "_translate")
    return {"ok": True, "session_id": session_id}


@app.get("/history")
def history(session_id: str):
    return {
        "ok": True,
        "session_id": session_id,
        "history": load_history(session_id, limit=100),
        "translate_history": load_history(session_id + "_translate", limit=100)
    }


@app.get("/api/config")
def api_config():
    return {"ok": True, "config": load_config()}


@app.post("/api/config/update")
def api_config_update(
    vad_enabled: str = Form("false"),
    voice_mode: str = Form("stable_recording"),
    learning_auto_apply: str = Form("false"),
    language_hint: str = Form("auto")
):
    config = load_config()

    config["vad"]["enabled"] = vad_enabled == "true"
    config["voice_mode"] = voice_mode
    config["learning"]["auto_apply"] = learning_auto_apply == "true"
    config["learning"]["language_hint"] = language_hint

    save_config(config)

    return {"ok": True, "config": config}


@app.get("/api/voice-filter")
def api_voice_filter():
    data = read_config_file(VOICE_FILTER_PATH, {
        "enabled": True,
        "mode": "monitor_only",
        "background_patterns": []
    })
    return {"ok": True, "config": data}


@app.post("/api/voice-filter/mode")
def api_voice_filter_mode(mode: str = Form("monitor_only")):
    data = read_config_file(VOICE_FILTER_PATH, {
        "enabled": True,
        "mode": "monitor_only",
        "background_patterns": []
    })

    if mode not in ["monitor_only", "block"]:
        mode = "monitor_only"

    data["mode"] = mode
    save_config_file(VOICE_FILTER_PATH, data)

    return {"ok": True, "config": data}


@app.post("/api/voice-filter/enabled")
def api_voice_filter_enabled(enabled: str = Form("true")):
    data = read_config_file(VOICE_FILTER_PATH, {
        "enabled": True,
        "mode": "monitor_only",
        "background_patterns": []
    })

    data["enabled"] = enabled == "true"
    save_config_file(VOICE_FILTER_PATH, data)

    return {"ok": True, "config": data}


@app.get("/api/turn-config")
def api_turn_config():
    data = read_config_file(TURN_CONFIG_PATH, {
        "enabled": True,
        "mode": "monitor_only",
        "min_text_length": 2,
        "continue_patterns": [],
        "complete_patterns": []
    })
    return {"ok": True, "config": data}


@app.post("/api/turn-config/mode")
def api_turn_config_mode(mode: str = Form("monitor_only")):
    data = read_config_file(TURN_CONFIG_PATH, {
        "enabled": True,
        "mode": "monitor_only",
        "min_text_length": 2,
        "continue_patterns": [],
        "complete_patterns": []
    })

    if mode not in ["monitor_only", "block"]:
        mode = "monitor_only"

    data["mode"] = mode
    save_config_file(TURN_CONFIG_PATH, data)

    return {"ok": True, "config": data}


@app.post("/api/turn-config/enabled")
def api_turn_config_enabled(enabled: str = Form("true")):
    data = read_config_file(TURN_CONFIG_PATH, {
        "enabled": True,
        "mode": "monitor_only",
        "min_text_length": 2,
        "continue_patterns": [],
        "complete_patterns": []
    })

    data["enabled"] = enabled == "true"
    save_config_file(TURN_CONFIG_PATH, data)

    return {"ok": True, "config": data}


@app.get("/api/flow-signal-config")
def api_flow_signal_config():
    data = read_config_file(FLOW_SIGNAL_PATH, {
        "enabled": True,
        "show_listening": True,
        "show_thinking": True,
        "show_waiting": True,
        "show_processing": True,
        "default_message": "흐름 유지 중"
    })
    return {"ok": True, "config": data}


@app.get("/api/autoloop/analyze")
def api_autoloop_analyze():
    return analyze_logs_for_candidates(limit=500)


@app.get("/api/autoloop/candidates")
def api_autoloop_candidates():
    return {"ok": True, "candidates": load_candidates()}


@app.get("/api/learning/analyze")
def api_learning_analyze():
    analysis = analyze_stt_logs(limit=500)
    return {"ok": True, "analysis": analysis}


@app.post("/api/learning/apply")
def api_learning_apply():
    config = load_config()
    analysis = analyze_stt_logs(limit=500)
    config = apply_learning_to_config(config, analysis)
    save_config(config)
    return {"ok": True, "config": config, "analysis": analysis}

@app.get("/api/travel-links")
def api_travel_links():
    return list_categories()


@app.get("/api/travel-links/{category}")
def api_travel_links_category(category: str):
    return all_links_for_category(category)


@app.post("/api/travel-links/add")
def api_travel_links_add(
    category: str = Form(...),
    name: str = Form(...),
    url: str = Form(...)
):
    return add_user_link(
        category=category,
        name=name,
        url=url
    )


@app.post("/api/travel-links/delete")
def api_travel_links_delete(
    category: str = Form(...),
    index: int = Form(...)
):
    return delete_user_link(
        category=category,
        index=index
    )
@app.get("/api/state")
def state():
    config = load_config()

    return {
        "ok": True,
        "version": "KRXA_FLOW_SIGNAL_CONTROL_V1",
        "openai_key": bool(os.getenv("OPENAI_API_KEY")),
        "guest_session_mode": True,
        "membership": "planned_for_app_release",
        "modes": ["translate_only", "agency"],
        "routes": {
            "translate_only": "/api/translate",
            "agency": "/api/turn",
            "test_voice": "/test_voice"
        },
        "voice_filter": read_config_file(VOICE_FILTER_PATH, {}),
        "turn_config": read_config_file(TURN_CONFIG_PATH, {}),
        "flow_signal": read_config_file(FLOW_SIGNAL_PATH, {}),
        "config": config,
        "stats": stats(),
        "logs": load_logs(150)
    }
@app.post("/api/recommend")
async def api_recommend(request: Request):
    body = await request.json()

    category = body.get("category", "travel")
    lat = body.get("lat", "")
    lng = body.get("lng", "")
    keyword = body.get("keyword", "")

    return {
        "ok": True,
        "cards": [
            {
                "title": "주변 인기 장소",
                "desc": f"{keyword or category} 기준으로 현재 위치 주변에서 먼저 확인할 후보입니다.",
                "reason": "거리, 리뷰, 방문 가능성을 우선 확인하세요.",
                "map_keyword": keyword or category
            },
            {
                "title": "현지 후기 기반 후보",
                "desc": "지도 리뷰와 블로그/영상 후기를 함께 확인할 후보입니다.",
                "reason": "관광객 리뷰보다 현지 이용 흐름을 같이 보는 것이 좋습니다.",
                "map_keyword": keyword or category
            },
            {
                "title": "체험/실행 후보",
                "desc": "바로 길찾기와 통역으로 연결할 수 있는 실행 후보입니다.",
                "reason": "Travel V1은 추천 후 바로 실행하는 구조입니다.",
                "map_keyword": keyword or category
            }
        ],
        "gps": {"lat": lat, "lng": lng},
        "next": "map_search"
    }
@app.post("/api/recommend-market")
async def api_recommend_market(request: Request):
    body = await request.json()

    category = body.get("category", "travel")
    keyword = body.get("keyword", "")
    lat = body.get("lat", "")
    lng = body.get("lng", "")

    if category == "food":
        base = "맛집"
        research = ["TV 방송", "유튜브 먹방", "지도 리뷰", "별점", "현지인 후기"]
    elif category == "attraction":
        base = "관광지"
        research = ["관광 후기", "뉴스", "블로그", "영상", "방문자 흐름"]
    elif category == "experience":
        base = "체험"
        research = ["체험 후기", "예약 가능성", "유튜브", "SNS", "가족/연인 적합성"]
    else:
        base = "여행"
        research = ["지도", "리뷰", "영상", "뉴스", "인기"]

    q = keyword or base

    cards = [
        {
            "title": "현실 인기 기반 추천",
            "desc": f"{q} 후보를 TV·유튜브·리뷰·별점 기준으로 먼저 확인합니다.",
            "reason": "방송/영상/리뷰 언급이 있는 장소는 여행자가 판단하기 쉽습니다.",
            "map_keyword": q + " 인기"
        },
        {
            "title": "현재 위치 주변 후보",
            "desc": f"현재 GPS 주변에서 접근 가능한 {base} 후보를 확인합니다.",
            "reason": "거리와 이동 편의성이 실제 여행 실행 가능성을 결정합니다.",
            "map_keyword": q + " near me"
        },
        {
            "title": "실행형 추천",
            "desc": "선택 후 지도, 길찾기, 말대말 통역으로 바로 연결합니다.",
            "reason": "Travel V1은 추천에서 끝나지 않고 실행까지 연결합니다.",
            "map_keyword": q
        }
    ]

    return {
        "ok": True,
        "mode": "market_research_v1",
        "category": category,
        "keyword": q,
        "gps": {"lat": lat, "lng": lng},
        "research_sources": research,
        "cards": cards,
        "next": "map_or_execute"
    }
@app.get("/api/travel-discovery")
def travel_discovery_get():
    path = Path("storage/travel_discovery_places.json")

    if not path.exists():
        return {
            "ok": False,
            "message": "travel discovery file not found",
            "items": []
        }

    try:
        data = json.loads(path.read_text(encoding="utf-8"))
        items = data.get("items", [])
        active_items = [x for x in items if x.get("status") == "active"]
        return {
            "ok": True,
            "name": data.get("name", "Travel V1 Discovery Places"),
            "items": active_items
        }
    except Exception as e:
        return {
            "ok": False,
            "message": "travel discovery read error",
            "error": str(e),
            "items": []
        }
@app.get("/api/travel-service-links")
def travel_service_links_get(group: str = ""):
    path = Path("storage/travel_service_links.json")

    if not path.exists():
        return {
            "ok": False,
            "message": "travel service links file not found",
            "groups": {}
        }

    try:
        data = json.loads(path.read_text(encoding="utf-8"))
        groups = data.get("groups", {})

        if group:
            g = groups.get(group)
            if not g:
                return {"ok": False, "message": "group not found", "group": group}

            items = [x for x in g.get("items", []) if x.get("status") == "active"]
            user_items = [x for x in g.get("user_items", []) if x.get("status") == "active"]

            return {
                "ok": True,
                "group": group,
                "label": g.get("label", group),
                "description": g.get("description", ""),
                "user_add_enabled": g.get("user_add_enabled", True),
                "items": items,
                "user_items": user_items
            }

        return {"ok": True, "groups": groups}

    except Exception as e:
        return {
            "ok": False,
            "message": "travel service links read error",
            "error": str(e),
            "groups": {}
        }


@app.post("/api/travel-service-links/user-add")
async def travel_service_links_user_add(request: Request):
    body = await request.json()

    group = body.get("group", "")
    name = body.get("name", "")
    url = body.get("url", "")

    if not group or not name or not url:
        return {"ok": False, "message": "group, name, url required"}

    path = Path("storage/travel_service_links.json")

    if not path.exists():
        return {"ok": False, "message": "travel service links file not found"}

    data = json.loads(path.read_text(encoding="utf-8"))
    groups = data.get("groups", {})

    if group not in groups:
        return {"ok": False, "message": "group not found"}

    user_items = groups[group].get("user_items", [])

    item = {
        "id": f"user-{group}-{len(user_items)+1:03d}",
        "name": name,
        "url": url,
        "status": "active",
        "source": "user"
    }

    user_items.append(item)
    groups[group]["user_items"] = user_items
    data["groups"] = groups

    path.write_text(json.dumps(data, ensure_ascii=False, indent=2), encoding="utf-8")

    return {"ok": True, "item": item}


@app.post("/api/travel-service-links/user-delete")
async def travel_service_links_user_delete(request: Request):
    body = await request.json()

    group = body.get("group", "")
    item_id = body.get("id", "")

    if not group or not item_id:
        return {"ok": False, "message": "group, id required"}

    path = Path("storage/travel_service_links.json")

    if not path.exists():
        return {"ok": False, "message": "travel service links file not found"}

    data = json.loads(path.read_text(encoding="utf-8"))
    groups = data.get("groups", {})

    if group not in groups:
        return {"ok": False, "message": "group not found"}

    user_items = groups[group].get("user_items", [])

    for item in user_items:
        if item.get("id") == item_id:
            item["status"] = "deleted"
            path.write_text(json.dumps(data, ensure_ascii=False, indent=2), encoding="utf-8")
            return {"ok": True, "item": item}

    return {"ok": False, "message": "user item not found"}

@app.post("/api/travel-discovery/create")
async def travel_discovery_create(request: Request):
    body = await request.json()
    path = Path("storage/travel_discovery_places.json")
    path.parent.mkdir(parents=True, exist_ok=True)

    if path.exists():
        data = json.loads(path.read_text(encoding="utf-8"))
    else:
        data = {
            "name": "Travel V1 Discovery Places",
            "status": "active",
            "items": []
        }

    items = data.get("items", [])

    item = {
        "id": body.get("id") or f"place-{len(items)+1:03d}",
        "type": body.get("type", "food"),
        "title": body.get("title", ""),
        "subtitle": body.get("subtitle", ""),
        "reason": body.get("reason", ""),
        "source": body.get("source", ""),
        "broadcast": body.get("broadcast", ""),
        "keyword": body.get("keyword", ""),
        "map_keyword": body.get("map_keyword", ""),
        "address": body.get("address", ""),
        "phone": body.get("phone", ""),
        "route_hint": body.get("route_hint", ""),
        "status": body.get("status", "active")
    }

    items.append(item)
    data["items"] = items

    path.write_text(json.dumps(data, ensure_ascii=False, indent=2), encoding="utf-8")

    return {"ok": True, "item": item, "total": len(items)}


@app.post("/api/travel-discovery/delete")
async def travel_discovery_delete(request: Request):
    body = await request.json()
    place_id = body.get("id")

    path = Path("storage/travel_discovery_places.json")
    if not path.exists():
        return {"ok": False, "message": "travel discovery file not found"}

    data = json.loads(path.read_text(encoding="utf-8"))
    items = data.get("items", [])

    for item in items:
        if item.get("id") == place_id:
            item["status"] = "deleted"
            path.write_text(json.dumps(data, ensure_ascii=False, indent=2), encoding="utf-8")
            return {"ok": True, "item": item}

    return {"ok": False, "message": "place not found"}
@app.post("/api/travel-discovery/update")
async def travel_discovery_update(request: Request):
    body = await request.json()
    place_id = body.get("id")

    path = Path("storage/travel_discovery_places.json")
    if not path.exists():
        return {"ok": False, "message": "travel discovery file not found"}

    data = json.loads(path.read_text(encoding="utf-8"))
    items = data.get("items", [])

    for item in items:
        if item.get("id") == place_id:
            for key in [
                "type", "title", "subtitle", "reason", "source",
                "broadcast", "keyword", "map_keyword", "address",
                "phone", "route_hint", "status"
            ]:
                if key in body:
                    item[key] = body.get(key)

            path.write_text(
                json.dumps(data, ensure_ascii=False, indent=2),
                encoding="utf-8"
            )
            return {"ok": True, "item": item}

    return {"ok": False, "message": "place not found"}
@app.get("/control", response_class=HTMLResponse)
def control():
    payload = {
        "version": "KRXA_FLOW_SIGNAL_CONTROL_V1",
        "openai_key": bool(os.getenv("OPENAI_API_KEY")),
        "guest_session_mode": True,
        "membership": "inactive_now / planned_at_app_install",
        "modes": {
            "translate_only": "free",
            "agency": "paid_later"
        },
        "routes": {
            "translate_only": "/api/translate",
            "agency": "/api/turn",
            "test_voice": "/test_voice"
        },
        "voice_filter": read_config_file(VOICE_FILTER_PATH, {}),
        "turn_config": read_config_file(TURN_CONFIG_PATH, {}),
        "flow_signal": read_config_file(FLOW_SIGNAL_PATH, {}),
        "config": load_config(),
        "stats": stats(),
        "logs": load_logs(150)
    }

    return render_template(
        "control.html",
        state=html.escape(json.dumps(payload, ensure_ascii=False, indent=2))
    )

@app.get("/patch", response_class=HTMLResponse)
def patch():
    return HTMLResponse(
        Path("ui/patch.html").read_text(encoding="utf-8")
    )

@app.get("/dev", response_class=HTMLResponse)
def dev(path: str = ""):
    if path:
        target = safe_path(path)

        if target.is_file():
            content = html.escape(
                target.read_text(encoding="utf-8", errors="ignore")
            )

            return render_template(
                "dev.html",
                file_path=html.escape(path),
                file_content=content,
                file_list=""
            )

    items = []

    for item in sorted(ROOT.iterdir()):
        name = item.name

        if name.startswith(".git"):
            continue

        label = "[DIR]" if item.is_dir() else "[FILE]"

        items.append(
            f"<li><a href='/dev?path={html.escape(name)}'>{label} {html.escape(name)}</a></li>"
        )

    return render_template(
        "dev.html",
        file_path="",
        file_content="",
        file_list="".join(items)
    )


@app.post("/dev/save")
def dev_save(
    path: str = Form(...),
    content: str = Form(...)
):
    target = safe_path(path)
    target.write_text(content, encoding="utf-8")

    log_event("dev_save", {"path": path})

    return RedirectResponse(
        url=f"/dev?path={path}",
        status_code=303
    )


@app.post("/dev/create")
def dev_create(path: str = Form(...)):
    target = safe_path(path)
    target.parent.mkdir(parents=True, exist_ok=True)

    if not target.exists():
        target.write_text("", encoding="utf-8")

    log_event("dev_create", {"path": path})

    return RedirectResponse(
        url=f"/dev?path={path}",
        status_code=303
    )


@app.post("/dev/delete")
def dev_delete(path: str = Form(...)):
    target = safe_path(path)

    if target.is_file():
        target.unlink()
    elif target.is_dir():
        shutil.rmtree(target)

    log_event("dev_delete", {"path": path})

    return RedirectResponse(
        url="/dev",
        status_code=303
    )


@app.post("/api/stt")
async def api_stt(
    request: Request,
    file: UploadFile = File(...),
    session_id: str = Form(""),
    duration: float = Form(0),
    user_language_mode: str = Form("auto"),
    lat: str = Form(""),
    lng: str = Form(""),
    device_locale: str = Form("")
):
    device = request.headers.get("user-agent", "")
    config = load_config()

    result = await stt_with_detail(
        file=file,
        session_id=session_id,
        duration=duration,
        device=device,
        vad_config=config,
        user_language_mode=user_language_mode,
        lat=lat,
        lng=lng,
        device_locale=device_locale
    )

    result["vad_enabled"] = config.get("vad", {}).get("enabled", False)
    result["config_language_hint"] = (
        config.get("learning", {}).get("language_hint", "auto")
    )
    result["user_language_mode"] = user_language_mode
    result["gps_lat"] = lat
    result["gps_lng"] = lng
    result["device_locale"] = device_locale

    return result


@app.post("/api/tts")
def api_tts(
    text: str = Form(...),
    session_id: str = Form("")
):
      return tts_response(
        text=text,
        session_id=session_id
    )


# ===== KRXA Travel V1 UI Static Route =====
try:
    app.mount("/ui", StaticFiles(directory="ui", html=True), name="ui")
except Exception:
    pass


@app.get("/travel-v1", response_class=HTMLResponse)
def travel_v1():
    return render_template("app.html")
# ===== End KRXA Travel V1 UI Static Route =====

# ===== KRXAI Memory Loop Report API =====
from datetime import datetime
import json

@app.post("/api/krxai-memory/report")
def krxai_memory_report():
    path = Path("storage/krxai_memory_loop.json")
    path.parent.mkdir(parents=True, exist_ok=True)

    if path.exists():
        try:
            data = json.loads(path.read_text(encoding="utf-8"))
        except Exception:
            data = {}
    else:
        data = {}

    reports = data.get("reports", [])

    report = {
        "time": datetime.now().isoformat(timespec="seconds"),
        "project": "Travel V1",
        "type": "control_report",
        "recent_errors": [
            "통역 지연",
            "STT 전 점검 필요",
            "없는 문장 차단",
            "UI 개선 필요"
        ],
        "improve_candidates": [
            "STT 전 점검 엔진",
            "Truth First Mode 강화",
            "식당 사진분석 Truth First Vision",
            "통화/메신저 KRXA 중계 구조",
            "7페이지 UI 개선"
        ],
        "next_action": "STT 전 점검 엔진부터 적용"
    }

    reports.insert(0, report)

    data["name"] = "KRXAI Memory Loop Connector v01"
    data["status"] = "report_generated"
    data["project"] = "Travel V1"
    data["current_focus"] = "STT 전 점검, Truth First Mode, Travel UI 개선, 관제 보고 연결"
    data["reports"] = reports[:20]
    data["last_report"] = report
    data["next_action"] = report["next_action"]

    path.write_text(json.dumps(data, ensure_ascii=False, indent=2), encoding="utf-8")

    return {
        "ok": True,
        "message": "KRXAI 관제 보고 생성 완료",
        "report": report
    }


@app.get("/api/krxai-patches")
def krxai_patches_get():
    path = Path("storage/krxai_patch_queue.json")
    if not path.exists():
        return {
            "ok": False,
            "message": "patch queue file not found",
            "items": []
        }

    try:
        return json.loads(path.read_text(encoding="utf-8"))
    except Exception as e:
        return {
            "ok": False,
            "message": "patch queue read error",
            "error": str(e),
            "items": []
        }


@app.post("/api/krxai-patches/action")
async def krxai_patches_action(request: Request):
    body = await request.json()
    patch_id = body.get("id")
    action = body.get("action")

    path = Path("storage/krxai_patch_queue.json")
    if not path.exists():
        return {"ok": False, "message": "patch queue file not found"}

    data = json.loads(path.read_text(encoding="utf-8"))

    for item in data.get("items", []):
        if item.get("id") == patch_id:
            if action == "approve":
                item["status"] = "approved"
            elif action == "hold":
                item["status"] = "hold"
            elif action == "dev_request":
                item["status"] = "dev_requested"
            elif action == "request_approval":
                item["status"] = "pending_approval"
            elif action == "apply_ready":
                item["status"] = "apply_ready"
            else:
                return {"ok": False, "message": "unknown action"}

            item["last_action"] = action
            path.write_text(
                json.dumps(data, ensure_ascii=True, indent=2),
                encoding="utf-8"
            )
            return {"ok": True, "item": item}

    return {"ok": False, "message": "patch not found"}


@app.post("/api/krxai-patches/create")
async def krxai_patches_create(request: Request):
    body = await request.json()

    path = Path("storage/krxai_patch_queue.json")
    path.parent.mkdir(parents=True, exist_ok=True)

    if path.exists():
        try:
            data = json.loads(path.read_text(encoding="utf-8"))
        except Exception:
            data = {"name": "KRXAI Patch Proposal Queue", "status": "active", "items": []}
    else:
        data = {"name": "KRXAI Patch Proposal Queue", "status": "active", "items": []}

    items = data.get("items", [])

    patch_id = body.get("id") or f"patch-{len(items)+1:03d}"

    item = {
        "id": patch_id,
        "project": body.get("project", "Travel V1"),
        "problem": body.get("problem", ""),
        "target_files": body.get("target_files", []),
        "proposal": body.get("proposal", ""),
        "risk": body.get("risk", "low"),
        "status": body.get("status", "pending_approval"),
        "created_at": datetime.now().strftime("%Y-%m-%d"),
        "approval_required": bool(body.get("approval_required", True))
    }

    items.append(item)
    data["items"] = items

    path.write_text(
        json.dumps(data, ensure_ascii=True, indent=2),
        encoding="utf-8"
    )

    return {"ok": True, "item": item, "total": len(items)}


# ===== End KRXAI Memory Loop Report API =====



# ===== KRXAI Auto Memory Event API =====
@app.post("/api/krxai-memory/event")
async def krxai_memory_event(request: Request):
    import json
    from datetime import datetime

    path = Path("storage/krxai_memory_loop.json")
    path.parent.mkdir(parents=True, exist_ok=True)

    try:
        body = await request.json()
    except Exception:
        body = {}

    if path.exists():
        try:
            data = json.loads(path.read_text(encoding="utf-8"))
        except Exception:
            data = {}
    else:
        data = {
            "name": "KRXAI Auto Memory Loop v01",
            "mode": "auto_execution_loop",
            "project": "Travel V1",
            "events": []
        }

    events = data.get("events", [])

    event = {
        "time": datetime.now().isoformat(timespec="seconds"),
        "project": "Travel V1",
        "type": body.get("type", "unknown"),
        "source": body.get("source", "m2m_translate"),
        "status": body.get("status", ""),
        "input": body.get("input", ""),
        "output": body.get("output", ""),
        "message": body.get("message", "")
    }

    events.insert(0, event)
    data["events"] = events[:100]

    # 간단 자동분석
    fails = [e for e in events if "fail" in str(e.get("type","")) or "error" in str(e.get("type",""))]
    data["auto_analysis"] = {
        "total_events": len(events),
        "fail_events": len(fails),
        "next_candidate": "STT 전 Conversation Gate 개선" if len(fails) >= 3 else "통역 사용 데이터 계속 수집"
    }
    data["next_action"] = data["auto_analysis"]["next_candidate"]

    path.write_text(json.dumps(data, ensure_ascii=False, indent=2), encoding="utf-8")

    return {"ok": True, "event": event, "next_action": data["next_action"]}
# ===== End KRXAI Auto Memory Event API =====



@app.get("/api/travel-discovery-candidates")
def travel_discovery_candidates_get():
    path = Path("storage/travel_discovery_candidates.json")
    if not path.exists():
        return {"ok": True, "items": []}
    data = json.loads(path.read_text(encoding="utf-8"))
    items = data.get("items", [])
    return {"ok": True, "items": items}


@app.post("/api/travel-discovery-candidates/action")
async def travel_discovery_candidates_action(request: Request):
    body = await request.json()
    candidate_id = body.get("id")
    action = body.get("action")

    cand_path = Path("storage/travel_discovery_candidates.json")
    place_path = Path("storage/travel_discovery_places.json")

    if not cand_path.exists():
        return {"ok": False, "message": "candidate file not found"}

    cand_data = json.loads(cand_path.read_text(encoding="utf-8"))
    candidates = cand_data.get("items", [])

    target = None
    for item in candidates:
        if item.get("id") == candidate_id:
            target = item
            break

    if not target:
        return {"ok": False, "message": "candidate not found"}

    if action == "approve":
        if place_path.exists():
            place_data = json.loads(place_path.read_text(encoding="utf-8"))
        else:
            place_data = {"name": "Travel V1 Discovery Places", "status": "active", "items": []}

        place_item = dict(target)
        place_item["id"] = "place-" + candidate_id.replace("candidate-", "")
        place_item["status"] = "active"

        place_data.setdefault("items", []).append(place_item)
        place_path.write_text(json.dumps(place_data, ensure_ascii=False, indent=2), encoding="utf-8")

        target["status"] = "approved"

    elif action == "hold":
        target["status"] = "hold"

    elif action == "delete":
        target["status"] = "deleted"

    else:
        return {"ok": False, "message": "unknown action"}

    cand_path.write_text(json.dumps(cand_data, ensure_ascii=False, indent=2), encoding="utf-8")
    return {"ok": True, "action": action, "item": target}

@app.get("/control/workspace")
def control_workspace():
    from fastapi.responses import HTMLResponse
    path = Path("ui/control_workspace.html")
    return HTMLResponse(path.read_text(encoding="utf-8"))


@app.get("/api/travel-hero-cards")
def travel_hero_cards_get():
    path = Path("storage/travel_hero_cards.json")
    if not path.exists():
        return {"ok": True, "items": []}

    data = json.loads(path.read_text(encoding="utf-8"))
    items = [x for x in data.get("items", []) if x.get("status") == "active"]
    return {"ok": True, "items": items}


@app.post("/api/travel-hero-cards/create")
async def travel_hero_cards_create(request: Request):
    body = await request.json()
    path = Path("storage/travel_hero_cards.json")
    path.parent.mkdir(parents=True, exist_ok=True)

    if path.exists():
        data = json.loads(path.read_text(encoding="utf-8"))
    else:
        data = {"name": "Travel V1 Hero Cards", "status": "active", "items": []}

    items = data.get("items", [])
    item = {
        "id": body.get("id") or f"hero-{len(items)+1:03d}",
        "title": body.get("title", ""),
        "subtitle": body.get("subtitle", ""),
        "source": body.get("source", ""),
        "keyword": body.get("keyword", ""),
        "map_keyword": body.get("map_keyword", ""),
        "linked_group": body.get("linked_group", ""),
        "status": body.get("status", "active")
    }

    items.append(item)
    data["items"] = items
    path.write_text(json.dumps(data, ensure_ascii=False, indent=2), encoding="utf-8")
    return {"ok": True, "item": item}


@app.post("/api/travel-hero-cards/update")
async def travel_hero_cards_update(request: Request):
    body = await request.json()
    hero_id = body.get("id")

    path = Path("storage/travel_hero_cards.json")
    if not path.exists():
        return {"ok": False, "message": "hero cards file not found"}

    data = json.loads(path.read_text(encoding="utf-8"))
    items = data.get("items", [])

    for item in items:
        if item.get("id") == hero_id:
            for key in ["title", "subtitle", "source", "keyword", "map_keyword", "linked_group", "status"]:
                if key in body:
                    item[key] = body.get(key)

            path.write_text(json.dumps(data, ensure_ascii=False, indent=2), encoding="utf-8")
            return {"ok": True, "item": item}

    return {"ok": False, "message": "hero card not found"}


@app.post("/api/travel-hero-cards/delete")
async def travel_hero_cards_delete(request: Request):
    body = await request.json()
    hero_id = body.get("id")

    path = Path("storage/travel_hero_cards.json")
    if not path.exists():
        return {"ok": False, "message": "hero cards file not found"}

    data = json.loads(path.read_text(encoding="utf-8"))
    items = data.get("items", [])

    for item in items:
        if item.get("id") == hero_id:
            item["status"] = "deleted"
            path.write_text(json.dumps(data, ensure_ascii=False, indent=2), encoding="utf-8")
            return {"ok": True, "item": item}

    return {"ok": False, "message": "hero card not found"}


@app.get("/api/travel-place-groups")
def travel_place_groups_get(group: str = ""):
    path = Path("storage/travel_place_groups.json")
    if not path.exists():
        return {"ok": True, "groups": {}, "items": []}

    data = json.loads(path.read_text(encoding="utf-8"))
    groups = data.get("groups", {})

    if group:
        g = groups.get(group)
        if not g:
            return {"ok": False, "message": "group not found", "group": group, "items": []}

        items = [x for x in g.get("items", []) if x.get("status") == "active"]
        return {
            "ok": True,
            "group": group,
            "title": g.get("title", group),
            "source": g.get("source", ""),
            "items": items
        }

    return {"ok": True, "groups": groups}

@app.get("/travel-map")
def travel_map_window():
    from fastapi.responses import HTMLResponse
    path = Path("ui/travel_map.html")
    return HTMLResponse(path.read_text(encoding="utf-8"))


@app.post("/api/krxa-map-place/create")
async def krxa_map_place_create(request: Request):
    body = await request.json()
    path = Path("storage/krxa_map_db.json")
    data = json.loads(path.read_text(encoding="utf-8")) if path.exists() else {
        "name": "KRXA Map DB",
        "version": "v2",
        "status": "active",
        "places": [],
        "daily_update_log": []
    }

    places = data.setdefault("places", [])
    item = {
        "id": body.get("id") or f"map-place-{len(places)+1:03d}",
        "category": body.get("category", "food"),
        "title": body.get("title", ""),
        "region": body.get("region", ""),
        "address": body.get("address", ""),
        "phone": body.get("phone", ""),
        "source_type": body.get("source_type", ""),
        "source_title": body.get("source_title", ""),
        "source_url": body.get("source_url", ""),
        "evidence_note": body.get("evidence_note", ""),
        "reason": body.get("reason", ""),
        "map_keyword": body.get("map_keyword", body.get("title", "")),
        "lat": body.get("lat", ""),
        "lng": body.get("lng", ""),
        "real_place": bool(body.get("real_place", True)),
        "verified": bool(body.get("verified", True)),
        "verified_at": body.get("verified_at", ""),
        "status": body.get("status", "active")
    }

    places.append(item)
    path.write_text(json.dumps(data, ensure_ascii=False, indent=2), encoding="utf-8")
    return {"ok": True, "item": item}


@app.post("/api/krxa-map-place/update")
async def krxa_map_place_update(request: Request):
    body = await request.json()
    place_id = body.get("id")
    path = Path("storage/krxa_map_db.json")

    if not path.exists():
        return {"ok": False, "message": "krxa_map_db.json not found"}

    data = json.loads(path.read_text(encoding="utf-8"))

    for item in data.get("places", []):
        if item.get("id") == place_id:
            for key in [
                "category","title","region","address","phone",
                "source_type","source_title","source_url","evidence_note",
                "reason","map_keyword","lat","lng",
                "real_place","verified","verified_at","status"
            ]:
                if key in body:
                    item[key] = body.get(key)

            path.write_text(json.dumps(data, ensure_ascii=False, indent=2), encoding="utf-8")
            return {"ok": True, "item": item}

    return {"ok": False, "message": "place not found"}


@app.post("/api/krxa-map-place/delete")
async def krxa_map_place_delete(request: Request):
    body = await request.json()
    place_id = body.get("id")
    path = Path("storage/krxa_map_db.json")

    if not path.exists():
        return {"ok": False, "message": "krxa_map_db.json not found"}

    data = json.loads(path.read_text(encoding="utf-8"))

    for item in data.get("places", []):
        if item.get("id") == place_id:
            item["status"] = "deleted"
            path.write_text(json.dumps(data, ensure_ascii=False, indent=2), encoding="utf-8")
            return {"ok": True, "item": item}

    return {"ok": False, "message": "place not found"}


@app.get("/api/market-research/jobs")
def market_research_jobs_get():
    path = Path("storage/krxa_market_research_jobs.json")
    if not path.exists():
        return {"ok": True, "jobs": []}
    data = json.loads(path.read_text(encoding="utf-8"))
    return {"ok": True, "data": data}


@app.post("/api/market-research/run")
async def market_research_run(request: Request):
    body = await request.json()

    keyword = body.get("keyword", "방송 유튜브 맛집")
    source_type = body.get("source_type", "Control")
    source_title = body.get("source_title", "수동 시장조사")
    source_url = body.get("source_url", "")
    region = body.get("region", "현재 위치 주변")
    note = body.get("note", "")

    # 가상 후보 금지: source_url 없으면 승인 후보가 아니라 조사대기 후보로만 저장
    verified = bool(source_url)

    now = datetime.now().isoformat()

    job_path = Path("storage/krxa_market_research_jobs.json")
    cand_path = Path("storage/travel_discovery_candidates.json")

    jobs = json.loads(job_path.read_text(encoding="utf-8")) if job_path.exists() else {
        "name": "KRXA Market Research Nightly Engine",
        "version": "v1",
        "jobs": [],
        "last_run": ""
    }

    candidates = json.loads(cand_path.read_text(encoding="utf-8")) if cand_path.exists() else {
        "name": "Travel V1 Discovery Candidates",
        "status": "active",
        "items": []
    }

    candidate_id = "candidate-" + now.replace("-", "").replace(":", "").replace(".", "")

    item = {
        "id": candidate_id,
        "type": body.get("type", "food"),
        "title": body.get("title", keyword),
        "subtitle": body.get("subtitle", "시장조사 기반 후보"),
        "reason": body.get("reason", "실제 출처 확인 후 승인 대상입니다."),
        "source": source_type,
        "broadcast": source_title,
        "keyword": keyword,
        "map_keyword": body.get("map_keyword", keyword),
        "address": body.get("address", ""),
        "phone": body.get("phone", ""),
        "source_type": source_type,
        "source_title": source_title,
        "source_url": source_url,
        "region": region,
        "verified": verified,
        "real_place": verified,
        "evidence_note": note,
        "route_hint": "사용자 GPS 기준으로 목적지까지 가는 방법을 확인합니다.",
        "status": "pending" if verified else "research_needed",
        "created_at": now
    }

    candidates.setdefault("items", []).append(item)

    jobs.setdefault("jobs", []).append({
        "time": now,
        "keyword": keyword,
        "source_type": source_type,
        "source_title": source_title,
        "source_url": source_url,
        "region": region,
        "verified": verified,
        "result": "candidate_created",
        "candidate_id": candidate_id
    })
    jobs["last_run"] = now

    cand_path.write_text(json.dumps(candidates, ensure_ascii=False, indent=2), encoding="utf-8")
    job_path.write_text(json.dumps(jobs, ensure_ascii=False, indent=2), encoding="utf-8")

    return {
        "ok": True,
        "message": "market research candidate created",
        "verified": verified,
        "item": item
    }


@app.get("/control/branch")
def control_branch():
    from fastapi.responses import HTMLResponse
    path = Path("ui/control_branch.html")
    return HTMLResponse(path.read_text(encoding="utf-8"))


@app.get("/api/market-research-feed")
def market_research_feed_get(category: str = ""):
    path = Path("storage/market_research_feed.json")
    if not path.exists():
        return {"ok": True, "categories": [], "items": []}

    data = json.loads(path.read_text(encoding="utf-8"))
    items = data.get("items", [])

    if category:
        items = [x for x in items if x.get("category") == category]

    return {
        "ok": True,
        "categories": data.get("categories", []),
        "items": items
    }


@app.post("/api/market-research-feed/action")
async def market_research_feed_action(request: Request):
    body = await request.json()
    item_id = body.get("id")
    action = body.get("action")

    path = Path("storage/market_research_feed.json")
    if not path.exists():
        return {"ok": False, "message": "feed not found"}

    data = json.loads(path.read_text(encoding="utf-8"))

    for item in data.get("items", []):
        if item.get("id") == item_id:
            if action == "approve":
                item["status"] = "approved"
            elif action == "hold":
                item["status"] = "hold"
            elif action == "delete":
                item["status"] = "deleted"
            else:
                return {"ok": False, "message": "unknown action"}

            path.write_text(json.dumps(data, ensure_ascii=False, indent=2), encoding="utf-8")
            return {"ok": True, "item": item}

    return {"ok": False, "message": "item not found"}


@app.get("/control/item")
def control_item():
    from fastapi.responses import HTMLResponse
    path = Path("ui/control_item.html")
    return HTMLResponse(path.read_text(encoding="utf-8"))


@app.get("/api/market-research-feed/item")
def market_research_feed_item_get(id: str):
    path = Path("storage/market_research_feed.json")
    if not path.exists():
        return {"ok": False, "message": "feed not found"}

    data = json.loads(path.read_text(encoding="utf-8"))
    for item in data.get("items", []):
        if item.get("id") == id:
            return {"ok": True, "item": item}

    return {"ok": False, "message": "item not found"}

@app.get("/api/travel-branches")
def travel_branches_get():
    path = Path("storage/travel_branches.json")
    if not path.exists():
        return {"ok": False, "branches": []}
    return json.loads(path.read_text(encoding="utf-8"))

@app.post("/api/travel-branches/save")
async def travel_branches_save(request: Request):
    body = await request.json()
    path = Path("storage/travel_branches.json")
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(body, ensure_ascii=False, indent=2), encoding="utf-8")
    return {"ok": True, "saved": True}


@app.get("/travel-branch")
def travel_branch_page():
    return HTMLResponse(Path("ui/travel_branch.html").read_text(encoding="utf-8"))


@app.get("/travel-list")
def travel_list_page():
    return HTMLResponse(Path("ui/travel_list.html").read_text(encoding="utf-8"))

@app.post("/api/market-research-feed/update")
async def market_research_feed_update(request: Request):
    body = await request.json()
    item_id = body.get("id")

    path = Path("storage/market_research_feed.json")
    if not path.exists():
        return {"ok": False, "message": "feed not found"}

    data = json.loads(path.read_text(encoding="utf-8"))

    for item in data.get("items", []):
        if item.get("id") == item_id:
            for key in ["title","region","address","phone","source_title","source_url","map_keyword","reason"]:
                if key in body:
                    item[key] = body.get(key)

            path.write_text(json.dumps(data, ensure_ascii=False, indent=2), encoding="utf-8")
            return {"ok": True, "item": item}

    return {"ok": False, "message": "item not found"}


@app.get("/dev/workspace")
def dev_workspace():
    from fastapi.responses import HTMLResponse
    path = Path("ui/dev_workspace.html")
    return HTMLResponse(path.read_text(encoding="utf-8"))


@app.post("/api/market-research-feed/create")
async def market_research_feed_create(request: Request):
    body = await request.json()
    path = Path("storage/market_research_feed.json")

    if not path.exists():
        data = {
            "name": "KRXA Market Research Feed",
            "version": "v1",
            "categories": [],
            "items": []
        }
    else:
        data = json.loads(path.read_text(encoding="utf-8"))

    items = data.setdefault("items", [])
    item = {
        "id": body.get("id") or f"{body.get('category','item')}-{len(items)+1:03d}",
        "category": body.get("category", "baekban"),
        "title": body.get("title", ""),
        "region": body.get("region", ""),
        "address": body.get("address", ""),
        "phone": body.get("phone", ""),
        "source_title": body.get("source_title", ""),
        "source_url": body.get("source_url", ""),
        "map_keyword": body.get("map_keyword", body.get("title", "")),
        "reason": body.get("reason", ""),
        "verified": bool(body.get("source_url", "")),
        "status": "review"
    }

    items.append(item)
    path.write_text(json.dumps(data, ensure_ascii=False, indent=2), encoding="utf-8")
    return {"ok": True, "item": item}

@app.get("/api/travel-recommend")
def travel_recommend_get():
    path = Path("storage/travel_branches.json")
    if not path.exists():
        return {"ok": False, "message": "travel_branches.json not found", "cards": []}
    data = json.loads(path.read_text(encoding="utf-8"))
    cards = []
    for branch in data.get("branches", []):
        if not branch.get("active", False) or not branch.get("hero_enabled", False):
            continue
        for item in branch.get("items", []):
            if not item.get("active", False):
                continue
            score = int(item.get("score", 0) or 0)
            priority = int(item.get("priority", 99) or 99)
            cards.append({
                "branch_id": branch.get("id", ""), "branch_title": branch.get("title", ""),
                "place_id": item.get("id", ""), "title": branch.get("title", ""),
                "name": item.get("name", ""), "region": item.get("region", ""),
                "address": item.get("address", ""), "map_keyword": item.get("map_keyword", ""),
                "source": item.get("source", branch.get("title", "")),
                "reason": "활성화된 추천 장소입니다.", "priority": priority, "score": score,
                "destination": item.get("address") or item.get("map_keyword") or item.get("name", "")
            })
    cards = sorted(cards, key=lambda x: (-x.get("score", 0), x.get("priority", 99)))[:5]
    return {"ok": True, "mode": "Travel Recommend API v2", "cards": cards}

@app.get("/api/travel-memory")
def travel_memory_get():
    path = Path("storage/travel_memory.json")
    if not path.exists():
        return {"ok": True, "version": "v1", "events": []}
    try:
        return json.loads(path.read_text(encoding="utf-8"))
    except Exception as e:
        return {"ok": False, "error": str(e), "events": []}

@app.post("/api/travel-memory/add")
async def travel_memory_add(request: Request):
    body = await request.json()
    path = Path("storage/travel_memory.json")
    path.parent.mkdir(parents=True, exist_ok=True)
    if path.exists():
        try:
            data = json.loads(path.read_text(encoding="utf-8"))
        except Exception:
            data = {"version": "v1", "events": []}
    else:
        data = {"version": "v1", "events": []}
    event = {
        "time": datetime.now().isoformat(timespec="seconds"),
        "action": body.get("action", "unknown"),
        "branch_id": body.get("branch_id", ""), "branch_title": body.get("branch_title", ""),
        "place_id": body.get("place_id", ""), "place_name": body.get("place_name", ""),
        "destination": body.get("destination", ""), "lat": body.get("lat", ""),
        "lng": body.get("lng", ""), "source": body.get("source", "user_ui")
    }
    events = data.get("events", [])
    events.insert(0, event)
    data["events"] = events[:500]
    path.write_text(json.dumps(data, ensure_ascii=False, indent=2), encoding="utf-8")
    return {"ok": True, "event": event, "total": len(data["events"])}

@app.post("/api/travel-memory/reset")
def travel_memory_reset():
    path = Path("storage/travel_memory.json")
    path.parent.mkdir(parents=True, exist_ok=True)
    data = {"version": "v1", "events": []}
    path.write_text(json.dumps(data, ensure_ascii=False, indent=2), encoding="utf-8")
    return {"ok": True, "reset": True}

@app.get("/control/travel-dashboard")
def control_travel_dashboard_page():
    return HTMLResponse(Path("ui/control_travel_dashboard.html").read_text(encoding="utf-8"))

@app.get("/dev/travel-branch")
def dev_travel_branch_page():
    return HTMLResponse(Path("ui/dev_travel_branch.html").read_text(encoding="utf-8"))

@app.get("/dev/travel-analytics")
def dev_travel_analytics_page():
    return HTMLResponse(Path("ui/travel_analytics.html").read_text(encoding="utf-8"))

# ===== KRXA Travel Control DEV Flow v1 Patch =====

@app.get("/api/dev-requests")
def dev_requests_get():
    path = Path("storage/dev_requests.json")
    if not path.exists():
        return {"ok": True, "requests": []}
    try:
        return json.loads(path.read_text(encoding="utf-8"))
    except Exception as e:
        return {"ok": False, "error": str(e), "requests": []}

@app.post("/api/dev-requests/add")
async def dev_requests_add(request: Request):
    body = await request.json()
    path = Path("storage/dev_requests.json")
    path.parent.mkdir(parents=True, exist_ok=True)
    if path.exists():
        try:
            data = json.loads(path.read_text(encoding="utf-8"))
        except Exception:
            data = {"ok": True, "requests": []}
    else:
        data = {"ok": True, "requests": []}
    req = {
        "id": "req-" + datetime.now().strftime("%Y%m%d%H%M%S"),
        "time": datetime.now().isoformat(timespec="seconds"),
        "title": body.get("title",""),
        "body": body.get("body",""),
        "source": body.get("source",""),
        "status": body.get("status","requested")
    }
    items = data.get("requests", [])
    items.insert(0, req)
    data["requests"] = items[:300]
    path.write_text(json.dumps(data, ensure_ascii=False, indent=2), encoding="utf-8")
    return {"ok": True, "request": req}

# ===== KRXA Travel GPS Time Place Sync v1 =====

@app.get("/api/travel-context-state")
def travel_context_state_get():
    path = Path("storage/travel_context_state.json")
    if not path.exists():
        return {"version":"v1","mode":"auto","display":{"gps":"auto","date":"auto","time":"auto","place":"","language":"ko"},"internal":{"lat":"","lng":"","country":"","city":"","updatedAt":""},"control":{"allowOverride":False,"note":"default"}}
    return json.loads(path.read_text(encoding="utf-8"))

@app.post("/api/travel-context-state/save")
async def travel_context_state_save(request: Request):
    body = await request.json()
    path = Path("storage/travel_context_state.json")
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(body, ensure_ascii=False, indent=2), encoding="utf-8")
    return {"ok": True, "saved": True, "state": body}

@app.get("/control/travel-context")
def control_travel_context_page():
    return HTMLResponse(Path("ui/control_travel_context.html").read_text(encoding="utf-8"))

@app.get("/dev/travel-context")
def dev_travel_context_page():
    return HTMLResponse(Path("ui/dev_travel_context.html").read_text(encoding="utf-8"))
# ===== End KRXA Travel GPS Time Place Sync v1 =====


# ===== KRXA Travel Map Apps API v1 =====
from fastapi import Body
import json as _krxa_json
from pathlib import Path as _KRXAPath

_KRXA_MAP_APPS_PATH = _KRXAPath("storage") / "travel_map_apps.json"

def _krxa_default_map_apps():
    return {
        "version": "v1",
        "default_provider": "google",
        "providers": [
            {
                "id": "google",
                "name": "Google Maps",
                "enabled": True,
                "locked": True,
                "search_url": "https://www.google.com/maps/search/{query}",
                "dir_url": "https://www.google.com/maps/dir/?api=1&origin={origin}&destination={destination}"
            }
        ],
        "user_providers": []
    }

def _krxa_load_map_apps():
    _KRXA_MAP_APPS_PATH.parent.mkdir(exist_ok=True)
    if not _KRXA_MAP_APPS_PATH.exists():
        _KRXA_MAP_APPS_PATH.write_text(_krxa_json.dumps(_krxa_default_map_apps(), ensure_ascii=False, indent=2), encoding="utf-8")
    try:
        return _krxa_json.loads(_KRXA_MAP_APPS_PATH.read_text(encoding="utf-8"))
    except Exception:
        return _krxa_default_map_apps()

def _krxa_save_map_apps(data):
    _KRXA_MAP_APPS_PATH.parent.mkdir(exist_ok=True)
    _KRXA_MAP_APPS_PATH.write_text(_krxa_json.dumps(data, ensure_ascii=False, indent=2), encoding="utf-8")

@app.get("/api/travel-map-apps")
async def api_travel_map_apps():
    return {"ok": True, "state": _krxa_load_map_apps()}

@app.post("/api/travel-map-apps/save")
async def api_travel_map_apps_save(payload: dict = Body(...)):
    if "providers" not in payload:
        payload["providers"] = _krxa_default_map_apps()["providers"]
    if "user_providers" not in payload:
        payload["user_providers"] = []
    if "default_provider" not in payload:
        payload["default_provider"] = "google"
    _krxa_save_map_apps(payload)
    return {"ok": True, "state": payload}

@app.get("/control/travel-map-apps")
async def control_travel_map_apps():
    return FileResponse("ui/control_travel_map_apps.html")

@app.get("/dev/travel-map-apps")
async def dev_travel_map_apps():
    return FileResponse("ui/dev_travel_map_apps.html")
# ===== End KRXA Travel Map Apps API v1 =====


# ===== KRXA Travel User Control Dev Bridge v1 =====
@app.get("/control/travel-user-bridge")
async def control_travel_user_bridge():
    return FileResponse("ui/control_travel_user_bridge.html")

@app.get("/dev/travel-user-bridge")
async def dev_travel_user_bridge():
    return FileResponse("ui/dev_travel_user_bridge.html")
# ===== End KRXA Travel User Control Dev Bridge v1 =====


# ===== KRXA Travel UI Config API v1 =====
from fastapi import Body as _KRXA_Body
import json as _krxa_ui_json
from pathlib import Path as _KRXA_UI_Path

_KRXA_TRAVEL_UI_CONFIG_PATH = _KRXA_UI_Path("storage") / "travel_ui_config.json"

def _krxa_travel_ui_default_config():
    return {
        "version": "v1",
        "pages": []
    }

def _krxa_load_travel_ui_config():
    _KRXA_TRAVEL_UI_CONFIG_PATH.parent.mkdir(exist_ok=True)
    if not _KRXA_TRAVEL_UI_CONFIG_PATH.exists():
        _KRXA_TRAVEL_UI_CONFIG_PATH.write_text(
            _krxa_ui_json.dumps(_krxa_travel_ui_default_config(), ensure_ascii=False, indent=2),
            encoding="utf-8"
        )
    try:
        return _krxa_ui_json.loads(_KRXA_TRAVEL_UI_CONFIG_PATH.read_text(encoding="utf-8"))
    except Exception:
        return _krxa_travel_ui_default_config()

def _krxa_save_travel_ui_config(config):
    _KRXA_TRAVEL_UI_CONFIG_PATH.parent.mkdir(exist_ok=True)
    _KRXA_TRAVEL_UI_CONFIG_PATH.write_text(
        _krxa_ui_json.dumps(config, ensure_ascii=False, indent=2),
        encoding="utf-8"
    )

@app.get("/api/travel-ui-config")
async def api_travel_ui_config():
    return {"ok": True, "config": _krxa_load_travel_ui_config()}

@app.post("/api/travel-ui-config/save")
async def api_travel_ui_config_save(payload: dict = _KRXA_Body(...)):
    if "pages" not in payload:
        payload["pages"] = []
    _krxa_save_travel_ui_config(payload)
    return {"ok": True, "config": payload}
# ===== End KRXA Travel UI Config API v1 =====


# ===== KRXA Travel Page Layout API v1 =====
from fastapi import Body as _KRXA_LAYOUT_BODY
import json as _krxa_layout_json
from pathlib import Path as _KRXA_LAYOUT_Path

_KRXA_PAGE_LAYOUT_PATH = _KRXA_LAYOUT_Path("storage") / "travel_page_layout_config.json"

def _krxa_default_page_layout():
    return {
        "version": "v1",
        "page_count": 8,
        "page_width_percent": 800,
        "current_default_page": 0,
        "pages": [
            {"index": 0, "title": "사용자 UI 1", "enabled": True},
            {"index": 1, "title": "사용자 UI 2", "enabled": True},
            {"index": 2, "title": "사용자 UI 3", "enabled": True},
            {"index": 3, "title": "사용자 UI 4", "enabled": True},
            {"index": 4, "title": "사용자 UI 5", "enabled": True},
            {"index": 5, "title": "사용자 UI 6", "enabled": True},
            {"index": 6, "title": "사용자 UI 7", "enabled": True},
            {"index": 7, "title": "사용자 UI 8", "enabled": True}
        ]
    }

def _krxa_load_page_layout():
    _KRXA_PAGE_LAYOUT_PATH.parent.mkdir(exist_ok=True)
    if not _KRXA_PAGE_LAYOUT_PATH.exists():
        _KRXA_PAGE_LAYOUT_PATH.write_text(
            _krxa_layout_json.dumps(_krxa_default_page_layout(), ensure_ascii=False, indent=2),
            encoding="utf-8"
        )
    try:
        return _krxa_layout_json.loads(_KRXA_PAGE_LAYOUT_PATH.read_text(encoding="utf-8"))
    except Exception:
        return _krxa_default_page_layout()

def _krxa_save_page_layout(config):
    _KRXA_PAGE_LAYOUT_PATH.parent.mkdir(exist_ok=True)
    _KRXA_PAGE_LAYOUT_PATH.write_text(
        _krxa_layout_json.dumps(config, ensure_ascii=False, indent=2),
        encoding="utf-8"
    )

@app.get("/api/travel-page-layout-config")
async def api_travel_page_layout_config():
    return {"ok": True, "config": _krxa_load_page_layout()}

@app.post("/api/travel-page-layout-config/save")
async def api_travel_page_layout_config_save(payload: dict = _KRXA_LAYOUT_BODY(...)):
    if "page_count" not in payload:
        payload["page_count"] = 8
    if "page_width_percent" not in payload:
        payload["page_width_percent"] = int(payload["page_count"]) * 100
    if "pages" not in payload:
        payload["pages"] = _krxa_default_page_layout()["pages"]
    _krxa_save_page_layout(payload)
    return {"ok": True, "config": payload}

@app.get("/control/travel-page-layout")
async def control_travel_page_layout():
    return FileResponse("ui/control_travel_page_layout.html")

@app.get("/dev/travel-page-layout")
async def dev_travel_page_layout():
    return FileResponse("ui/dev_travel_page_layout.html")
# ===== End KRXA Travel Page Layout API v1 =====


# ===== KRXA Travel UI Components API v1 =====
from fastapi import Body as _KRXA_COMP_BODY
import json as _krxa_comp_json
from pathlib import Path as _KRXA_COMP_Path

_KRXA_UI_COMPONENTS_PATH = _KRXA_COMP_Path("storage") / "travel_ui_components.json"

def _krxa_default_ui_components():
    return {
        "version": "v1",
        "page1": {
            "gps": True,
            "hero": True,
            "mic": True
        }
    }

def _krxa_load_ui_components():
    _KRXA_UI_COMPONENTS_PATH.parent.mkdir(exist_ok=True)
    if not _KRXA_UI_COMPONENTS_PATH.exists():
        _KRXA_UI_COMPONENTS_PATH.write_text(
            _krxa_comp_json.dumps(_krxa_default_ui_components(), ensure_ascii=False, indent=2),
            encoding="utf-8"
        )
    try:
        return _krxa_comp_json.loads(_KRXA_UI_COMPONENTS_PATH.read_text(encoding="utf-8"))
    except Exception:
        return _krxa_default_ui_components()

def _krxa_save_ui_components(config):
    _KRXA_UI_COMPONENTS_PATH.parent.mkdir(exist_ok=True)
    _KRXA_UI_COMPONENTS_PATH.write_text(
        _krxa_comp_json.dumps(config, ensure_ascii=False, indent=2),
        encoding="utf-8"
    )

@app.get("/api/travel-ui-components")
async def api_travel_ui_components():
    return {"ok": True, "config": _krxa_load_ui_components()}

@app.post("/api/travel-ui-components/save")
async def api_travel_ui_components_save(payload: dict = _KRXA_COMP_BODY(...)):
    if "page1" not in payload:
        payload["page1"] = {"gps": True, "hero": True, "mic": True}
    _krxa_save_ui_components(payload)
    return {"ok": True, "config": payload}
# ===== End KRXA Travel UI Components API v1 =====


# ===== Travel GAP Patch 01 API =====
from fastapi import Body as _GAP01_BODY
import json as _gap01_json
from pathlib import Path as _GAP01_Path
from datetime import datetime as _GAP01_datetime

_GAP01_STORAGE = _GAP01_Path("storage")
_GAP01_UI_CONFIG = _GAP01_STORAGE / "travel_ui_config.json"
_GAP01_COMPONENTS = _GAP01_STORAGE / "travel_ui_components.json"

def _gap01_load_json(path, default):
    try:
        if path.exists():
            return _gap01_json.loads(path.read_text(encoding="utf-8"))
    except Exception:
        pass
    return default

def _gap01_save_json(path, data):
    path.parent.mkdir(exist_ok=True)
    path.write_text(
        _gap01_json.dumps(data, ensure_ascii=False, indent=2),
        encoding="utf-8"
    )

def _gap01_sync_components(config):
    synced = {
        "version": config.get("version", "v1"),
        "updatedAt": _GAP01_datetime.now().strftime("%Y%m%d_%H%M%S"),
        "pages": config.get("pages", [])
    }
    _gap01_save_json(_GAP01_COMPONENTS, synced)
    return synced

@app.get("/api/travel-ui-components")
async def api_gap01_travel_ui_components():
    config = _gap01_load_json(_GAP01_COMPONENTS, None)
    if config is None:
        base = _gap01_load_json(_GAP01_UI_CONFIG, {"version": "v1", "pages": []})
        config = _gap01_sync_components(base)
    return {"ok": True, "config": config}

@app.post("/api/travel-ui-components/save")
async def api_gap01_travel_ui_components_save(payload: dict = _GAP01_BODY(...)):
    _gap01_save_json(_GAP01_UI_CONFIG, payload)
    synced = _gap01_sync_components(payload)
    return {"ok": True, "config": synced, "message": "CONTROL saved and USER sync ready"}
# ===== End Travel GAP Patch 01 API =====


# ===== Travel GAP Patch 02 API =====
from fastapi import Body as _GAP02_BODY
from fastapi import Query as _GAP02_Query
import json as _gap02_json
from pathlib import Path as _GAP02_Path

_GAP02_CFG = _GAP02_Path("storage") / "travel_hub_control_config.json"

def _gap02_default():
    return {
        "version": "v1",
        "enabled": True,
        "title": "여행허브 추천",
        "input_enabled": True,
        "placeholder": "목적지나 원하는 장소를 입력하세요",
        "result_count": 8,
        "open_new_window": True,
        "origin_mode": "gps",
        "map_provider": "google",
        "categories": [
            {"id": "food", "name": "맛집", "enabled": True, "keywords": ["근처 맛집", "현지 인기 맛집", "허영만 백반기행 맛집"]},
            {"id": "hotel", "name": "호텔", "enabled": True, "keywords": ["근처 호텔", "인기 숙소", "가성비 호텔"]},
            {"id": "tour", "name": "관광지", "enabled": True, "keywords": ["근처 관광지", "인기 명소", "현지 추천 관광"]},
            {"id": "transport", "name": "교통", "enabled": True, "keywords": ["가까운 역", "택시", "버스 정류장"]},
            {"id": "shopping", "name": "쇼핑", "enabled": True, "keywords": ["근처 쇼핑", "시장", "마트"]},
            {"id": "airport", "name": "항공/공항", "enabled": True, "keywords": ["공항", "항공권", "공항 가는 길"]}
        ]
    }

def _gap02_load():
    _GAP02_CFG.parent.mkdir(exist_ok=True)
    if not _GAP02_CFG.exists():
        _GAP02_CFG.write_text(_gap02_json.dumps(_gap02_default(), ensure_ascii=False, indent=2), encoding="utf-8")
    try:
        return _gap02_json.loads(_GAP02_CFG.read_text(encoding="utf-8"))
    except Exception:
        return _gap02_default()

def _gap02_save(data):
    _GAP02_CFG.parent.mkdir(exist_ok=True)
    _GAP02_CFG.write_text(_gap02_json.dumps(data, ensure_ascii=False, indent=2), encoding="utf-8")

@app.get("/api/travel-hub-control-config")
async def api_travel_hub_control_config():
    return {"ok": True, "config": _gap02_load()}

@app.post("/api/travel-hub-control-config/save")
async def api_travel_hub_control_config_save(payload: dict = _GAP02_BODY(...)):
    _gap02_save(payload)
    return {"ok": True, "config": payload}

@app.get("/api/travel-hub-recommend")
async def api_travel_hub_recommend(
    category: str = _GAP02_Query("food"),
    query: str = _GAP02_Query(""),
    lat: str = _GAP02_Query(""),
    lng: str = _GAP02_Query("")
):
    cfg = _gap02_load()
    count = int(cfg.get("result_count", 8))
    cats = cfg.get("categories", [])
    cat = next((c for c in cats if c.get("id") == category), None)
    name = cat.get("name", category) if cat else category
    keywords = cat.get("keywords", []) if cat else [name]

    base = query.strip() if query and query.strip() else name
    items = []
    seed = keywords or [base]
    for i in range(count):
        kw = seed[i % len(seed)]
        title = f"{base} · {kw}" if query else kw
        items.append({
            "id": f"{category}-{i+1}",
            "title": title,
            "destination": title,
            "memo": "선택하면 현재 위치에서 목적지까지 Google Maps 길찾기를 엽니다."
        })
    return {"ok": True, "category": category, "items": items}
# ===== End Travel GAP Patch 02 API =====


# ===== Travel GAP Patch 03 API =====
from fastapi import Body as _GAP03_BODY
import json as _gap03_json
from pathlib import Path as _GAP03_Path
from datetime import datetime as _GAP03_datetime

_GAP03_STORAGE = _GAP03_Path("storage")
_GAP03_GROUPS = _GAP03_STORAGE / "travel_hero_groups.json"
_GAP03_PLACES = _GAP03_STORAGE / "travel_hero_places.json"

def _gap03_now():
    return _GAP03_datetime.now().strftime("%Y%m%d_%H%M%S")

def _gap03_default_groups():
    return {
        "version": "v1",
        "updatedAt": _gap03_now(),
        "groups": [
            {"id": "baekban", "title": "허영만 백반기행", "enabled": True, "type": "hero"},
            {"id": "baekjong", "title": "백종원 추천맛집", "enabled": True, "type": "hero"},
            {"id": "nearby_food", "title": "주변맛집", "enabled": True, "type": "hero"},
            {"id": "festival", "title": "지역축제", "enabled": True, "type": "hero"},
            {"id": "tour_news", "title": "뉴스관광지", "enabled": True, "type": "hero"}
        ]
    }

def _gap03_default_places():
    return {
        "version": "v1",
        "updatedAt": _gap03_now(),
        "places": [
            {
                "id": "baekban-001",
                "group_id": "baekban",
                "name": "늘본점수서본점",
                "region": "서울 강남",
                "category": "복어요리",
                "address": "서울 강남구 수서동",
                "keyword": "늘본점 수서본점",
                "enabled": True,
                "memo": "허영만 백반기행 예시 데이터"
            },
            {
                "id": "baekban-002",
                "group_id": "baekban",
                "name": "최가네",
                "region": "부천",
                "category": "한식",
                "address": "경기 부천시",
                "keyword": "최가네 부천 한식",
                "enabled": True,
                "memo": "예시 데이터"
            }
        ]
    }

def _gap03_load(path, default):
    path.parent.mkdir(exist_ok=True)
    if not path.exists():
        path.write_text(_gap03_json.dumps(default(), ensure_ascii=False, indent=2), encoding="utf-8")
    try:
        return _gap03_json.loads(path.read_text(encoding="utf-8"))
    except Exception:
        return default()

def _gap03_save(path, data):
    path.parent.mkdir(exist_ok=True)
    data["updatedAt"] = _gap03_now()
    path.write_text(_gap03_json.dumps(data, ensure_ascii=False, indent=2), encoding="utf-8")
    return data

@app.get("/api/travel-hero-groups")
async def api_travel_hero_groups():
    return {"ok": True, "config": _gap03_load(_GAP03_GROUPS, _gap03_default_groups)}

@app.post("/api/travel-hero-groups/save")
async def api_travel_hero_groups_save(payload: dict = _GAP03_BODY(...)):
    saved = _gap03_save(_GAP03_GROUPS, payload)
    return {"ok": True, "config": saved}

@app.get("/api/travel-hero-places")
async def api_travel_hero_places():
    return {"ok": True, "config": _gap03_load(_GAP03_PLACES, _gap03_default_places)}

@app.post("/api/travel-hero-places/save")
async def api_travel_hero_places_save(payload: dict = _GAP03_BODY(...)):
    saved = _gap03_save(_GAP03_PLACES, payload)
    return {"ok": True, "config": saved}
# ===== End Travel GAP Patch 03 API =====


# ===== Travel GAP Patch 04 API =====
from fastapi import Body as _GAP04_BODY
from fastapi import Query as _GAP04_Query
import json as _gap04_json
from pathlib import Path as _GAP04_Path
from datetime import datetime as _GAP04_datetime

_GAP04_STORAGE = _GAP04_Path("storage")
_GAP04_GROUPS = _GAP04_STORAGE / "travel_hero_groups.json"
_GAP04_PLACES = _GAP04_STORAGE / "travel_hero_places.json"

def _gap04_now():
    return _GAP04_datetime.now().strftime("%Y%m%d_%H%M%S")

def _gap04_load(path, default):
    path.parent.mkdir(exist_ok=True)
    if not path.exists():
        path.write_text(_gap04_json.dumps(default, ensure_ascii=False, indent=2), encoding="utf-8")
    try:
        return _gap04_json.loads(path.read_text(encoding="utf-8"))
    except Exception:
        return default

def _gap04_save(path, data):
    path.parent.mkdir(exist_ok=True)
    data["updatedAt"] = _gap04_now()
    path.write_text(_gap04_json.dumps(data, ensure_ascii=False, indent=2), encoding="utf-8")
    return data

_GAP04_DEFAULT_GROUPS = {
    "version": "v1",
    "groups": [
        {"id": "baekban", "title": "허영만 백반기행", "enabled": True},
        {"id": "baekjong", "title": "백종원 추천맛집", "enabled": True},
        {"id": "nearby_food", "title": "주변맛집", "enabled": True},
        {"id": "festival", "title": "지역축제", "enabled": True},
        {"id": "tour_news", "title": "뉴스관광지", "enabled": True}
    ]
}

_GAP04_DEFAULT_PLACES = {
    "version": "v1",
    "places": [
        {"id": "baekban-001", "group_id": "baekban", "name": "늘본점수서본점", "region": "서울 강남", "category": "복어요리", "address": "서울 강남구", "keyword": "늘본점 수서본점", "enabled": True},
        {"id": "baekban-002", "group_id": "baekban", "name": "최가네", "region": "부천", "category": "한식", "address": "경기 부천시", "keyword": "최가네 부천", "enabled": True},
        {"id": "baekban-003", "group_id": "baekban", "name": "허가네백반기행", "region": "주변", "category": "맛집", "address": "", "keyword": "허가네 백반기행", "enabled": True}
    ]
}

@app.get("/api/travel-hero-groups")
async def gap04_get_groups():
    return {"ok": True, "config": _gap04_load(_GAP04_GROUPS, _GAP04_DEFAULT_GROUPS)}

@app.post("/api/travel-hero-groups/save")
async def gap04_save_groups(payload: dict = _GAP04_BODY(...)):
    return {"ok": True, "config": _gap04_save(_GAP04_GROUPS, payload)}

@app.get("/api/travel-hero-places")
async def gap04_get_places(group: str = _GAP04_Query("")):
    data = _gap04_load(_GAP04_PLACES, _GAP04_DEFAULT_PLACES)
    if group:
        data = dict(data)
        data["places"] = [p for p in data.get("places", []) if p.get("group_id") == group]
    return {"ok": True, "config": data}

@app.post("/api/travel-hero-places/save")
async def gap04_save_places(payload: dict = _GAP04_BODY(...)):
    return {"ok": True, "config": _gap04_save(_GAP04_PLACES, payload)}

@app.get("/control/travel-hero-workspace")
async def gap04_hero_workspace():
    return FileResponse("ui/control_travel_hero_workspace.html")
# ===== End Travel GAP Patch 04 API =====


# ===== KRXA CONTROL SYNC ENGINE v1 =====
from fastapi import Body as _SYNC_BODY
import json as _sync_json
from pathlib import Path as _SYNC_Path
from datetime import datetime as _SYNC_datetime

_SYNC_STATE = _SYNC_Path("storage") / "control_sync_state.json"

def _sync_now():
    return _SYNC_datetime.now().strftime("%Y%m%d_%H%M%S")

def _sync_default():
    return {
        "version": "v1",
        "updatedAt": _sync_now(),
        "mode": "control_to_user",
        "user_ui_locked": True,
        "rules": [
            {
                "id": "page1_gps",
                "page": 1,
                "target": "gps",
                "enabled": True,
                "selectors": ["[data-component='gps']", "[data-kx-id='gps']"],
                "action": "show_hide"
            },
            {
                "id": "page1_hero",
                "page": 1,
                "target": "hero",
                "enabled": True,
                "selectors": ["[data-component='hero']", ".travelHero", ".discoveryHero"],
                "action": "show_hide"
            },
            {
                "id": "page1_mini_talk",
                "page": 1,
                "target": "mini_talk",
                "enabled": True,
                "selectors": ["[data-component='mini_talk']", "[data-component='m2m']", ".miniBar"],
                "action": "show_hide"
            }
        ],
        "data_sources": {
            "hero_groups": "/api/travel-hero-groups",
            "hero_places": "/api/travel-hero-places",
            "map_apps": "/api/travel-map-apps"
        }
    }

def _sync_load():
    _SYNC_STATE.parent.mkdir(exist_ok=True)
    if not _SYNC_STATE.exists():
        _SYNC_STATE.write_text(
            _sync_json.dumps(_sync_default(), ensure_ascii=False, indent=2),
            encoding="utf-8"
        )
    try:
        return _sync_json.loads(_SYNC_STATE.read_text(encoding="utf-8"))
    except Exception:
        return _sync_default()

def _sync_save(data):
    _SYNC_STATE.parent.mkdir(exist_ok=True)
    data["updatedAt"] = _sync_now()
    _SYNC_STATE.write_text(
        _sync_json.dumps(data, ensure_ascii=False, indent=2),
        encoding="utf-8"
    )
    return data

@app.get("/api/control-sync-state")
async def api_control_sync_state():
    return {"ok": True, "config": _sync_load()}

@app.post("/api/control-sync-state/save")
async def api_control_sync_state_save(payload: dict = _SYNC_BODY(...)):
    return {"ok": True, "config": _sync_save(payload)}

@app.post("/api/control-sync-state/apply-rule")
async def api_control_sync_state_apply_rule(payload: dict = _SYNC_BODY(...)):
    state = _sync_load()
    rule_id = payload.get("id")
    enabled = payload.get("enabled")
    found = False

    for r in state.get("rules", []):
        if r.get("id") == rule_id:
            r["enabled"] = bool(enabled)
            found = True

    if not found and rule_id:
        state.setdefault("rules", []).append(payload)

    saved = _sync_save(state)
    return {"ok": True, "config": saved}
# ===== End KRXA CONTROL SYNC ENGINE v1 =====


# ===== Travel UI Master Sync API v1 =====
from fastapi import Body as _MASTER_BODY
import json as _master_json
from pathlib import Path as _MASTER_Path
from datetime import datetime as _MASTER_datetime

_MASTER_UI_CONFIG = _MASTER_Path("storage") / "travel_ui_config.json"

def _master_now():
    return _MASTER_datetime.now().strftime("%Y%m%d_%H%M%S")

def _master_default():
    return {"version":"v1","updatedAt":_master_now(),"pages":[]}

def _master_load():
    _MASTER_UI_CONFIG.parent.mkdir(exist_ok=True)
    if not _MASTER_UI_CONFIG.exists():
        _MASTER_UI_CONFIG.write_text(
            _master_json.dumps(_master_default(), ensure_ascii=False, indent=2),
            encoding="utf-8"
        )
    try:
        return _master_json.loads(_MASTER_UI_CONFIG.read_text(encoding="utf-8"))
    except Exception:
        return _master_default()

def _master_save(data):
    _MASTER_UI_CONFIG.parent.mkdir(exist_ok=True)
    data["updatedAt"] = _master_now()
    _MASTER_UI_CONFIG.write_text(
        _master_json.dumps(data, ensure_ascii=False, indent=2),
        encoding="utf-8"
    )
    return data

@app.get("/api/travel-ui-master-config")
async def api_travel_ui_master_config():
    return {"ok": True, "config": _master_load()}

@app.post("/api/travel-ui-master-config/save")
async def api_travel_ui_master_config_save(payload: dict = _MASTER_BODY(...)):
    return {"ok": True, "config": _master_save(payload)}
# ===== End Travel UI Master Sync API v1 =====


# ===== Travel Function Reverse Map API v1 =====
from fastapi import Body as _REV_BODY
import json as _rev_json
from pathlib import Path as _REV_Path
from datetime import datetime as _REV_datetime

_REV_MAP = _REV_Path("storage") / "travel_function_map.json"

def _rev_now():
    return _REV_datetime.now().strftime("%Y%m%d_%H%M%S")

def _rev_load():
    _REV_MAP.parent.mkdir(exist_ok=True)
    if not _REV_MAP.exists():
        _REV_MAP.write_text(_rev_json.dumps({"version":"v1","pages":[]}, ensure_ascii=False, indent=2), encoding="utf-8")
    try:
        return _rev_json.loads(_REV_MAP.read_text(encoding="utf-8"))
    except Exception:
        return {"version":"v1","pages":[]}

def _rev_save(data):
    _REV_MAP.parent.mkdir(exist_ok=True)
    data["updatedAt"] = _rev_now()
    _REV_MAP.write_text(_rev_json.dumps(data, ensure_ascii=False, indent=2), encoding="utf-8")
    return data

@app.get("/api/travel-function-map")
async def api_travel_function_map():
    return {"ok": True, "config": _rev_load()}

@app.post("/api/travel-function-map/save")
async def api_travel_function_map_save(payload: dict = _REV_BODY(...)):
    return {"ok": True, "config": _rev_save(payload)}

@app.post("/api/dev-requests/from-function-map")
async def api_dev_request_from_function_map(payload: dict = _REV_BODY(...)):
    path = _REV_Path("storage") / "dev_requests.json"
    path.parent.mkdir(exist_ok=True)
    try:
        data = _rev_json.loads(path.read_text(encoding="utf-8")) if path.exists() else {"items":[]}
    except Exception:
        data = {"items":[]}
    data.setdefault("items", []).append({
        "createdAt": _rev_now(),
        "source": "travel_function_map",
        "payload": payload
    })
    path.write_text(_rev_json.dumps(data, ensure_ascii=False, indent=2), encoding="utf-8")
    return {"ok": True, "message": "DEV 개선요청 저장 완료"}
# ===== End Travel Function Reverse Map API v1 =====


# ===== Travel Control Function Inspector API v1 =====
from fastapi import Body as _INSP_BODY
import json as _insp_json
from pathlib import Path as _INSP_Path
from datetime import datetime as _INSP_datetime

_INSP_UI_CONFIG = _INSP_Path("storage") / "travel_ui_config.json"
_INSP_FUNCTION_MAP = _INSP_Path("storage") / "travel_function_map.json"
_INSP_DEV_REQUESTS = _INSP_Path("storage") / "dev_requests.json"

def _insp_now():
    return _INSP_datetime.now().strftime("%Y%m%d_%H%M%S")

def _insp_load(path, default):
    path.parent.mkdir(exist_ok=True)
    if not path.exists():
        path.write_text(_insp_json.dumps(default, ensure_ascii=False, indent=2), encoding="utf-8")
    try:
        return _insp_json.loads(path.read_text(encoding="utf-8"))
    except Exception:
        return default

def _insp_save(path, data):
    path.parent.mkdir(exist_ok=True)
    data["updatedAt"] = _insp_now()
    path.write_text(_insp_json.dumps(data, ensure_ascii=False, indent=2), encoding="utf-8")
    return data

@app.get("/api/travel-control-inspector")
async def api_travel_control_inspector():
    ui = _insp_load(_INSP_UI_CONFIG, {"version":"v1","pages":[]})
    fmap = _insp_load(_INSP_FUNCTION_MAP, {"version":"v1","pages":[]})
    return {"ok": True, "ui": ui, "function_map": fmap}

@app.post("/api/travel-control-inspector/save-ui")
async def api_travel_control_inspector_save_ui(payload: dict = _INSP_BODY(...)):
    saved = _insp_save(_INSP_UI_CONFIG, payload)
    return {"ok": True, "config": saved}

@app.post("/api/travel-control-inspector/dev-request")
async def api_travel_control_inspector_dev_request(payload: dict = _INSP_BODY(...)):
    data = _insp_load(_INSP_DEV_REQUESTS, {"items":[]})
    data.setdefault("items", []).append({
        "createdAt": _insp_now(),
        "source": "travel_control_function_inspector",
        "payload": payload
    })
    _insp_save(_INSP_DEV_REQUESTS, data)
    return {"ok": True, "message": "DEV 개선요청 저장 완료"}
# ===== End Travel Control Function Inspector API v1 =====


# ===== Admin User Screen Manager API v1 =====
from fastapi import Body as _AUSM_BODY
import json as _ausm_json
from pathlib import Path as _AUSM_Path
from datetime import datetime as _AUSM_datetime

_AUSM_CONFIG = _AUSM_Path("storage") / "travel_ui_config.json"

def _ausm_now():
    return _AUSM_datetime.now().strftime("%Y%m%d_%H%M%S")

def _ausm_load():
    _AUSM_CONFIG.parent.mkdir(exist_ok=True)
    if not _AUSM_CONFIG.exists():
        _AUSM_CONFIG.write_text(_ausm_json.dumps({"version":"v1","pages":[]}, ensure_ascii=False, indent=2), encoding="utf-8")
    try:
        return _ausm_json.loads(_AUSM_CONFIG.read_text(encoding="utf-8"))
    except Exception:
        return {"version":"v1","pages":[]}

def _ausm_save(data):
    _AUSM_CONFIG.parent.mkdir(exist_ok=True)
    data["updatedAt"] = _ausm_now()
    _AUSM_CONFIG.write_text(_ausm_json.dumps(data, ensure_ascii=False, indent=2), encoding="utf-8")
    return data

@app.get("/api/admin-user-screen-config")
async def api_admin_user_screen_config():
    return {"ok": True, "config": _ausm_load()}

@app.post("/api/admin-user-screen-config/save")
async def api_admin_user_screen_config_save(payload: dict = _AUSM_BODY(...)):
    return {"ok": True, "config": _ausm_save(payload)}
# ===== End Admin User Screen Manager API v1 =====


# ===== Admin Dynamic Bar Manager API v1 =====
from fastapi import Body as _DYN_BODY
import json as _dyn_json
from pathlib import Path as _DYN_Path
from datetime import datetime as _DYN_datetime

_DYN_CONFIG = _DYN_Path("storage") / "travel_ui_config.json"

def _dyn_now():
    return _DYN_datetime.now().strftime("%Y%m%d_%H%M%S")

def _dyn_load():
    if not _DYN_CONFIG.exists():
        return {"version":"dynamic_bar_v1","pages":[]}
    try:
        return _dyn_json.loads(_DYN_CONFIG.read_text(encoding="utf-8"))
    except Exception:
        return {"version":"dynamic_bar_v1","pages":[]}

def _dyn_save(data):
    _DYN_CONFIG.parent.mkdir(exist_ok=True)
    data["updatedAt"] = _dyn_now()
    _DYN_CONFIG.write_text(
        _dyn_json.dumps(data, ensure_ascii=False, indent=2),
        encoding="utf-8"
    )
    return data

@app.get("/api/admin-dynamic-bars")
async def api_admin_dynamic_bars():
    return {"ok": True, "config": _dyn_load()}

@app.post("/api/admin-dynamic-bars/save")
async def api_admin_dynamic_bars_save(payload: dict = _DYN_BODY(...)):
    return {"ok": True, "config": _dyn_save(payload)}
# ===== End Admin Dynamic Bar Manager API v1 =====


# ===== KRXA AI GATE V1 PAGE =====
@app.get("/ai-gate")
def ai_gate_page():
    return FileResponse("ui/ai_gate.html")
# ===== End KRXA AI GATE V1 PAGE =====


# ===== KRXA PROJECT INSPECTOR V1 PAGE =====
@app.get("/project-inspector")
def project_inspector_page():
    return FileResponse("ui/project_inspector.html")
# ===== End KRXA PROJECT INSPECTOR V1 PAGE =====


# ===== Travel Result Manager API v1 =====
from fastapi import Body as _TRM_BODY
from fastapi.responses import JSONResponse as _TRM_JSONResponse
import json as _trm_json
from pathlib import Path as _TRM_Path
from datetime import datetime as _TRM_datetime

_TRM_STORAGE = _TRM_Path("storage")
_TRM_RESULT = _TRM_STORAGE / "travel_result_manager.json"
_TRM_HERO_GROUPS = _TRM_STORAGE / "travel_hero_groups.json"
_TRM_HERO_PLACES = _TRM_STORAGE / "travel_hero_places.json"

def _trm_now():
    return _TRM_datetime.now().strftime("%Y%m%d_%H%M%S")

def _trm_load(path, default):
    path.parent.mkdir(exist_ok=True)
    if not path.exists():
        path.write_text(_trm_json.dumps(default, ensure_ascii=False, indent=2), encoding="utf-8")
    try:
        return _trm_json.loads(path.read_text(encoding="utf-8"))
    except Exception:
        return default

def _trm_save(path, data):
    path.parent.mkdir(exist_ok=True)
    data["updatedAt"] = _trm_now()
    path.write_text(_trm_json.dumps(data, ensure_ascii=False, indent=2), encoding="utf-8")
    return data

@app.get("/api/travel-result-manager")
async def api_travel_result_manager():
    return {"ok": True, "data": _trm_load(_TRM_RESULT, {"pages": [], "results": {}})}

@app.post("/api/travel-result-manager/save")
async def api_travel_result_manager_save(payload: dict = _TRM_BODY(...)):
    return {"ok": True, "data": _trm_save(_TRM_RESULT, payload)}

@app.get("/api/travel-hero-rotation")
async def api_travel_hero_rotation():
    groups = _trm_load(_TRM_HERO_GROUPS, {"groups": []})
    places = _trm_load(_TRM_HERO_PLACES, {"places": []})
    return {"ok": True, "groups": groups, "places": places}

@app.post("/api/travel-hero-rotation/groups/save")
async def api_travel_hero_groups_save(payload: dict = _TRM_BODY(...)):
    return {"ok": True, "groups": _trm_save(_TRM_HERO_GROUPS, payload)}

@app.post("/api/travel-hero-rotation/places/save")
async def api_travel_hero_places_save(payload: dict = _TRM_BODY(...)):
    return {"ok": True, "places": _trm_save(_TRM_HERO_PLACES, payload)}
# ===== End Travel Result Manager API v1 =====


# ===== Hero Rotation Control Manager API v1 =====
from fastapi import Body as _HRC_BODY
import json as _hrc_json
from pathlib import Path as _HRC_Path
from datetime import datetime as _HRC_datetime

_HRC_FILE = _HRC_Path("storage") / "travel_hero_groups.json"

def _hrc_now():
    return _HRC_datetime.now().strftime("%Y%m%d_%H%M%S")

def _hrc_default():
    return {
        "version": "hero_rotation_control_manager_v1",
        "updatedAt": _hrc_now(),
        "rotation": {"enabled": True, "interval_ms": 5000},
        "groups": [
            {"id": "baekban", "title": "허영만 백반기행", "subtitle": "방송 맛집 리스트", "enabled": True, "order": 1},
            {"id": "near_tour", "title": "주변 관광지", "subtitle": "현재 위치 주변 추천", "enabled": True, "order": 2},
            {"id": "festival", "title": "지역축제", "subtitle": "오늘 갈 만한 축제", "enabled": True, "order": 3},
            {"id": "course", "title": "추천코스", "subtitle": "하루 여행 동선", "enabled": True, "order": 4}
        ]
    }

def _hrc_load():
    _HRC_FILE.parent.mkdir(exist_ok=True)
    if not _HRC_FILE.exists():
        _HRC_FILE.write_text(_hrc_json.dumps(_hrc_default(), ensure_ascii=False, indent=2), encoding="utf-8")
    try:
        return _hrc_json.loads(_HRC_FILE.read_text(encoding="utf-8"))
    except Exception:
        return _hrc_default()

def _hrc_save(data):
    _HRC_FILE.parent.mkdir(exist_ok=True)
    data["updatedAt"] = _hrc_now()
    _HRC_FILE.write_text(_hrc_json.dumps(data, ensure_ascii=False, indent=2), encoding="utf-8")
    return data

@app.get("/api/hero-rotation-control")
async def api_hero_rotation_control():
    return {"ok": True, "data": _hrc_load()}

@app.post("/api/hero-rotation-control/save")
async def api_hero_rotation_control_save(payload: dict = _HRC_BODY(...)):
    return {"ok": True, "data": _hrc_save(payload)}
# ===== End Hero Rotation Control Manager API v1 =====


# ===== User UI Based Control Flow Manager API v1 =====
from fastapi import Body as _UCF_BODY
import json as _ucf_json
from pathlib import Path as _UCF_Path
from datetime import datetime as _UCF_datetime

_UCF_FILE = _UCF_Path("storage") / "travel_control_flow_config.json"

def _ucf_now():
    return _UCF_datetime.now().strftime("%Y%m%d_%H%M%S")

def _ucf_load():
    if not _UCF_FILE.exists():
        return {"version": "empty", "pages": [], "flows": {}}
    try:
        return _ucf_json.loads(_UCF_FILE.read_text(encoding="utf-8"))
    except Exception:
        return {"version": "error", "pages": [], "flows": {}}

def _ucf_save(data):
    _UCF_FILE.parent.mkdir(exist_ok=True)
    data["updatedAt"] = _ucf_now()
    _UCF_FILE.write_text(_ucf_json.dumps(data, ensure_ascii=False, indent=2), encoding="utf-8")
    return data

@app.get("/api/user-ui-control-flow")
async def api_user_ui_control_flow():
    return {"ok": True, "data": _ucf_load()}

@app.post("/api/user-ui-control-flow/save")
async def api_user_ui_control_flow_save(payload: dict = _UCF_BODY(...)):
    return {"ok": True, "data": _ucf_save(payload)}
# ===== End User UI Based Control Flow Manager API v1 =====


# ===== Travel Control Total Final API v1 =====
from fastapi import Body as _TCT_BODY
import json as _tct_json
from pathlib import Path as _TCT_Path
from datetime import datetime as _TCT_datetime

_TCT_FILE = _TCT_Path("storage") / "travel_control_total_structure_map.json"

def _tct_now():
    return _TCT_datetime.now().strftime("%Y%m%d_%H%M%S")

def _tct_load():
    if not _TCT_FILE.exists():
        return {"version":"empty","pages":[],"components":{}}
    try:
        return _tct_json.loads(_TCT_FILE.read_text(encoding="utf-8"))
    except Exception:
        return {"version":"error","pages":[],"components":{}}

def _tct_save(data):
    _TCT_FILE.parent.mkdir(exist_ok=True)
    data["updatedAt"] = _tct_now()
    _TCT_FILE.write_text(_tct_json.dumps(data, ensure_ascii=False, indent=2), encoding="utf-8")
    return data

@app.get("/api/travel-control-total")
async def api_travel_control_total():
    return {"ok": True, "data": _tct_load()}

@app.post("/api/travel-control-total/save")
async def api_travel_control_total_save(payload: dict = _TCT_BODY(...)):
    return {"ok": True, "data": _tct_save(payload)}

@app.get("/control/travel-control-workspace")
async def control_travel_control_workspace():
    return FileResponse("ui/travel_control_workspace.html")
# ===== End Travel Control Total Final API v1 =====


# ===== PATCH17 Control First API =====
from fastapi import Body as _P17_BODY
import json as _p17_json
from pathlib import Path as _P17_Path
from datetime import datetime as _P17_datetime

_P17_FILE = _P17_Path("storage") / "patch17_control_first.json"

def _p17_now():
    return _P17_datetime.now().strftime("%Y%m%d_%H%M%S")

def _p17_load():
    if not _P17_FILE.exists():
        return {"version":"empty","pages":[],"components":{}}
    try:
        return _p17_json.loads(_P17_FILE.read_text(encoding="utf-8"))
    except Exception:
        return {"version":"error","pages":[],"components":{}}

def _p17_save(data):
    _P17_FILE.parent.mkdir(exist_ok=True)
    data["updatedAt"] = _p17_now()
    _P17_FILE.write_text(_p17_json.dumps(data, ensure_ascii=False, indent=2), encoding="utf-8")
    return data

@app.get("/api/patch17/control-first")
async def api_patch17_control_first():
    return {"ok": True, "data": _p17_load()}

@app.post("/api/patch17/control-first/save")
async def api_patch17_control_first_save(payload: dict = _P17_BODY(...)):
    return {"ok": True, "data": _p17_save(payload)}

@app.get("/control/patch17-workspace")
async def control_patch17_workspace():
    return FileResponse("ui/patch17_workspace.html")
# ===== End PATCH17 Control First API =====


# ===== PATCH21 Flow Engine API =====
from pathlib import Path as _P21_Path
import json as _p21_json

_P21_FILE = _P21_Path("storage") / "travel_flow_engine_v1.json"

@app.get("/api/patch21/flow-engine")
async def api_patch21_flow_engine():
    if not _P21_FILE.exists():
        return {"ok": False, "data": {"flows": []}}
    return {"ok": True, "data": _p21_json.loads(_P21_FILE.read_text(encoding="utf-8"))}

@app.get("/control/flow-engine")
async def control_patch21_flow_engine():
    return FileResponse("ui/control_travel_flow_engine.html")
# ===== End PATCH21 Flow Engine API =====


# ===== PATCH22 Workspace Factory Routes =====
@app.get("/control/workspace-factory")
async def patch22_workspace_factory():
    return FileResponse("ui/patch22_workspace_factory.html")
# ===== End PATCH22 Workspace Factory Routes =====


# ===== PATCH23 Travel Tree Workspace =====
@app.get("/control/travel-tree")
async def patch23_travel_tree_workspace():
    return FileResponse("ui/control_travel_tree_workspace.html")
# ===== End PATCH23 Travel Tree Workspace =====


# ===== PATCH30 User Mirror Admin =====
@app.get("/control/user-mirror")
async def patch30_user_mirror_admin():
    return FileResponse("ui/control_user_mirror_admin.html")
# ===== End PATCH30 User Mirror Admin =====


# PATCH48_50_TRAVEL_V1_FINAL_ROUTER_START
try:
    from core.travel_api_router import router as travel_v1_final_router
    app.include_router(travel_v1_final_router)
    print("[TravelV1] final router loaded: /api/travel-v1/*")
except Exception as e:
    print("[TravelV1] final router load failed:", repr(e))

try:
    from core.travel_scheduler import start_travel_scheduler
    start_travel_scheduler()
    print("[TravelV1] scheduler armed: Thursday 01:00 KST")
except Exception as e:
    print("[TravelV1] scheduler start failed:", repr(e))
# PATCH48_50_TRAVEL_V1_FINAL_ROUTER_END


# PATCH51_53_PLACE_KNOWLEDGE_ROUTER_START
try:
    from core.travel_place_knowledge_router import router as travel_place_knowledge_router
    app.include_router(travel_place_knowledge_router)
    print('[TravelV1] place knowledge router loaded: /api/travel-v1/knowledge/*')
except Exception as e:
    print('[TravelV1] place knowledge router load failed:', repr(e))
# PATCH51_53_PLACE_KNOWLEDGE_ROUTER_END
