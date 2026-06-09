from pathlib import Path
import html
import json
import os
import shutil

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
def patch(request: Request):
    return templates.TemplateResponse(
        "patch.html",
        {"request": request, "title": "KRXA PATCH"}
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

