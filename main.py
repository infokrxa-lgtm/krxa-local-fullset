from pathlib import Path
import html
import json
import os
import shutil
import time

from fastapi import FastAPI, Form, UploadFile, File, Request
from fastapi.responses import HTMLResponse, RedirectResponse

from core.krxa_engine import process
from core.krxa_travel import get_cards
from core.krxa_store import (
    new_id, load_history, save_turn, clear_history,
    load_logs, stats, log_event, read_json, write_json
)
from core.krxa_voice import stt, tts_response
from core.krxa_vad import VAD_DEFAULT_CONFIG
from core.krxa_learning import analyze_stt_logs, apply_learning_to_config

app = FastAPI(title="KRXA LOCAL FULLSET REAL")
ROOT = Path(".").resolve()
CONFIG_PATH = Path("storage") / "config.json"


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


def get_config():
    default = {
        "vad": VAD_DEFAULT_CONFIG,
        "voice_mode": "stable_recording",
        "interpreter_default": True,
        "learning": {
            "language_hint": "auto",
            "prefer_korean_for_short_utterance": True,
            "noise_filter_add": [],
            "vad_recommendation": "stable_recording",
            "auto_apply": False
        }
    }

    saved = read_json(CONFIG_PATH, {})
    if isinstance(saved, dict):
        default.update(saved)
        default.setdefault("vad", VAD_DEFAULT_CONFIG)
        default.setdefault("learning", {})
        default["learning"].setdefault("language_hint", "auto")
        default["learning"].setdefault("prefer_korean_for_short_utterance", True)
        default["learning"].setdefault("noise_filter_add", [])
        default["learning"].setdefault("vad_recommendation", "stable_recording")
        default["learning"].setdefault("auto_apply", False)

    return default


def save_config(data):
    write_json(CONFIG_PATH, data)
    log_event("config_saved", data)
    return data


@app.get("/")
def root():
    return {"ok": True, "version": "KRXA_LEARNING_PHASE1"}


@app.get("/user", response_class=HTMLResponse)
def user():
    return render_template("user.html")


@app.get("/app", response_class=HTMLResponse)
def app_ui(service: str = "free"):
    return render_template("app.html", service=service)


@app.post("/chat")
async def chat(
    text: str = Form(...),
    service: str = Form("free"),
    session_id: str = Form(""),
    mode: str = Form("interpreter")
):
    started = time.time()

    if not session_id:
        session_id = new_id("session")

    history = load_history(session_id, limit=12)

    result = process(
        text=text,
        history=history,
        service=service,
        mode=mode
    )

    cards = get_cards(text, service)

    save_turn(
        session_id=session_id,
        user_text=text,
        krxa_text=result,
        service=service,
        cards=cards,
        mode=mode
    )

    elapsed = round(time.time() - started, 3)

    log_event("chat_response", {
        "session_id": session_id,
        "mode": mode,
        "elapsed": elapsed
    })

    return {
        "ok": True,
        "result": result,
        "cards": cards,
        "session_id": session_id,
        "mode": mode,
        "elapsed": elapsed
    }


@app.post("/history/clear")
def history_clear(session_id: str = Form(...)):
    clear_history(session_id)
    return {"ok": True, "session_id": session_id}


@app.get("/history")
def history(session_id: str):
    return {
        "ok": True,
        "session_id": session_id,
        "history": load_history(session_id, limit=100)
    }


@app.get("/api/config")
def api_config():
    return {"ok": True, "config": get_config()}


@app.post("/api/config/update")
def api_config_update(
    vad_enabled: str = Form("false"),
    voice_mode: str = Form("stable_recording"),
    learning_auto_apply: str = Form("false"),
    language_hint: str = Form("auto")
):
    config = get_config()

    config["vad"]["enabled"] = vad_enabled == "true"
    config["voice_mode"] = voice_mode
    config["learning"]["auto_apply"] = learning_auto_apply == "true"
    config["learning"]["language_hint"] = language_hint

    save_config(config)

    return {"ok": True, "config": config}


@app.get("/api/learning/analyze")
def api_learning_analyze():
    analysis = analyze_stt_logs(limit=500)
    return {"ok": True, "analysis": analysis}


@app.post("/api/learning/apply")
def api_learning_apply():
    config = get_config()
    analysis = analyze_stt_logs(limit=500)
    config = apply_learning_to_config(config, analysis)
    save_config(config)

    return {
        "ok": True,
        "config": config,
        "analysis": analysis
    }


@app.get("/api/state")
def state():
    config = get_config()

    return {
        "ok": True,
        "version": "KRXA_LEARNING_PHASE1",
        "openai_key": bool(os.getenv("OPENAI_API_KEY")),
        "guest_session_mode": True,
        "membership": "planned_for_app_release",
        "modes": ["interpreter", "agency"],
        "config": config,
        "stats": stats(),
        "logs": load_logs(150)
    }


@app.get("/control", response_class=HTMLResponse)
def control():
    payload = {
        "version": "KRXA_LEARNING_PHASE1",
        "openai_key": bool(os.getenv("OPENAI_API_KEY")),
        "guest_session_mode": True,
        "membership": "inactive_now / planned_at_app_install",
        "modes": {
            "interpreter": "free",
            "agency": "paid_later"
        },
        "config": get_config(),
        "stats": stats(),
        "logs": load_logs(150)
    }

    return render_template(
        "control.html",
        state=html.escape(json.dumps(payload, ensure_ascii=False, indent=2))
    )


@app.get("/dev", response_class=HTMLResponse)
def dev(path: str = ""):
    if path:
        target = safe_path(path)
        if target.is_file():
            content = html.escape(target.read_text(encoding="utf-8", errors="ignore"))
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
def dev_save(path: str = Form(...), content: str = Form(...)):
    target = safe_path(path)
    target.write_text(content, encoding="utf-8")
    log_event("dev_save", {"path": path})
    return RedirectResponse(url=f"/dev?path={path}", status_code=303)


@app.post("/dev/create")
def dev_create(path: str = Form(...)):
    target = safe_path(path)
    target.parent.mkdir(parents=True, exist_ok=True)

    if not target.exists():
        target.write_text("", encoding="utf-8")

    log_event("dev_create", {"path": path})
    return RedirectResponse(url=f"/dev?path={path}", status_code=303)


@app.post("/dev/delete")
def dev_delete(path: str = Form(...)):
    target = safe_path(path)

    if target.is_file():
        target.unlink()
    elif target.is_dir():
        shutil.rmtree(target)

    log_event("dev_delete", {"path": path})
    return RedirectResponse(url="/dev", status_code=303)


@app.post("/api/stt")
async def api_stt(
    request: Request,
    file: UploadFile = File(...),
    session_id: str = Form(""),
    duration: float = Form(0)
):
    device = request.headers.get("user-agent", "")
    config = get_config()

    text = await stt(
        file=file,
        session_id=session_id,
        duration=duration,
        device=device,
        vad_config=config
    )

    return {
        "ok": bool(text),
        "text": text,
        "vad_enabled": config.get("vad", {}).get("enabled", False),
        "language_hint": config.get("learning", {}).get("language_hint", "auto")
    }


@app.post("/api/tts")
def api_tts(
    text: str = Form(...),
    session_id: str = Form("")
):
    return tts_response(text=text, session_id=session_id)