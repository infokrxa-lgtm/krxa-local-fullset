from pathlib import Path
import html
import json
import os
import shutil

from fastapi import FastAPI, Form, UploadFile, File
from fastapi.responses import HTMLResponse, RedirectResponse

from core.krxa_engine import process
from core.krxa_travel import get_cards
from core.krxa_store import new_id, load_history, save_turn, clear_history, load_logs
from core.krxa_voice import stt, tts_response

app = FastAPI(title="KRXA LOCAL FULLSET REAL")
ROOT = Path(".").resolve()


def render_template(name: str, **kwargs):
    path = Path("ui") / name
    text = path.read_text(encoding="utf-8")
    for key, value in kwargs.items():
        text = text.replace("__" + key.upper() + "__", str(value))
    return text


def safe_path(p: str = ""):
    target = (ROOT / p).resolve()
    if not str(target).startswith(str(ROOT)):
        raise ValueError("invalid path")
    return target


@app.get("/")
def root():
    return {"ok": True, "version": "KRXA_MODE_FULLSET_V1"}


@app.get("/user", response_class=HTMLResponse)
def user():
    return render_template("user.html")


@app.get("/app", response_class=HTMLResponse)
def app_ui(service: str = "free"):
    return render_template("app.html", service=service)


@app.post("/chat")
def chat(
    text: str = Form(...),
    service: str = Form("free"),
    session_id: str = Form(""),
    mode: str = Form("interpreter")
):
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
        cards=cards
    )

    return {
        "ok": True,
        "result": result,
        "cards": cards,
        "session_id": session_id,
        "mode": mode
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


@app.get("/api/state")
def state():
    return {
        "ok": True,
        "version": "KRXA_MODE_FULLSET_V1",
        "openai_key": bool(os.getenv("OPENAI_API_KEY")),
        "guest_session_mode": True,
        "membership": "planned_for_app_release",
        "modes": ["interpreter", "agency"],
        "logs": load_logs(80)
    }


@app.get("/control", response_class=HTMLResponse)
def control():
    state_json = json.dumps({
        "version": "KRXA_MODE_FULLSET_V1",
        "openai_key": bool(os.getenv("OPENAI_API_KEY")),
        "guest_session_mode": True,
        "membership": "inactive_now / planned_at_app_install",
        "modes": {
            "interpreter": "free",
            "agency": "paid_later"
        },
        "logs": load_logs(80)
    }, ensure_ascii=False, indent=2)

    return render_template("control.html", state=html.escape(state_json))


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
        items.append(f"<li><a href='/dev?path={html.escape(name)}'>{label} {html.escape(name)}</a></li>")

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
    return RedirectResponse(url=f"/dev?path={path}", status_code=303)


@app.post("/dev/create")
def dev_create(path: str = Form(...)):
    target = safe_path(path)
    target.parent.mkdir(parents=True, exist_ok=True)
    if not target.exists():
        target.write_text("", encoding="utf-8")
    return RedirectResponse(url=f"/dev?path={path}", status_code=303)


@app.post("/dev/delete")
def dev_delete(path: str = Form(...)):
    target = safe_path(path)
    if target.is_file():
        target.unlink()
    elif target.is_dir():
        shutil.rmtree(target)
    return RedirectResponse(url="/dev", status_code=303)


@app.post("/api/stt")
async def api_stt(file: UploadFile = File(...)):
    text = await stt(file)
    return {"ok": True, "text": text}


@app.post("/api/tts")
def api_tts(text: str = Form(...)):
    return tts_response(text)