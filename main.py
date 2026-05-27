from pathlib import Path

from fastapi import FastAPI, Form, UploadFile, File
from fastapi.responses import HTMLResponse

from core.krxa_engine import process
from core.krxa_travel import get_cards
from core.krxa_store import new_id, load_history, save_turn, clear_history, load_logs
from core.krxa_voice import stt, tts_response

app = FastAPI(title="KRXA LOCAL FULLSET")


def render_template(name: str, **kwargs):
    path = Path("ui") / name
    text = path.read_text(encoding="utf-8")
    for key, value in kwargs.items():
        text = text.replace("__" + key.upper() + "__", str(value))
    return text


@app.get("/")
def root():
    return {"ok": True, "version": "KRXA_LOCAL_FULLSET_V1"}


@app.get("/user", response_class=HTMLResponse)
def user():
    return render_template("user.html")


@app.get("/app", response_class=HTMLResponse)
def app_ui(service: str = "free"):
    return render_template("app.html", service=service)


@app.post("/chat")
def chat(text: str = Form(...), service: str = Form("free"), session_id: str = Form("")):
    if not session_id:
        session_id = new_id("session")

    history = load_history(session_id, limit=12)
    result = process(text, history=history, service=service)
    cards = get_cards(text, service)
    save_turn(session_id, text, result, service, cards)

    return {"ok": True, "result": result, "cards": cards, "session_id": session_id}


@app.post("/history/clear")
def history_clear(session_id: str = Form(...)):
    clear_history(session_id)
    return {"ok": True, "session_id": session_id}


@app.get("/history")
def history(session_id: str):
    return {"ok": True, "session_id": session_id, "history": load_history(session_id, limit=100)}


@app.get("/api/state")
def state():
    return {"ok": True, "version": "KRXA_LOCAL_FULLSET_V1", "logs": load_logs(80)}


@app.get("/control", response_class=HTMLResponse)
def control():
    return render_template("control.html", logs=load_logs(80))


@app.get("/dev", response_class=HTMLResponse)
def dev():
    return render_template("dev.html")


@app.post("/api/stt")
async def api_stt(file: UploadFile = File(...)):
    text = await stt(file)
    return {"ok": True, "text": text}


@app.post("/api/tts")
def api_tts(text: str = Form(...)):
    return tts_response(text)