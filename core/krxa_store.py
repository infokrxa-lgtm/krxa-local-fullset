import json
from pathlib import Path
from datetime import datetime
from uuid import uuid4

BASE = Path("storage")
HISTORY_DIR = BASE / "history"
LOG_DIR = Path("logs")
SYSTEM_LOG = LOG_DIR / "system.log"

HISTORY_DIR.mkdir(parents=True, exist_ok=True)
LOG_DIR.mkdir(parents=True, exist_ok=True)


def now():
    return datetime.now().strftime("%Y-%m-%d %H:%M:%S")


def new_id(prefix="id"):
    return f"{prefix}-{uuid4().hex[:12]}"


def history_path(session_id):
    safe = session_id.replace("/", "_").replace("\\", "_")
    return HISTORY_DIR / f"{safe}.json"


def read_json(path, default):
    try:
        if path.exists():
            return json.loads(path.read_text(encoding="utf-8"))
    except Exception:
        pass
    return default


def write_json(path, data):
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(
        json.dumps(data, ensure_ascii=False, indent=2),
        encoding="utf-8"
    )


def log_event(kind, detail=None):
    item = {
        "time": now(),
        "kind": kind,
        "detail": detail or {}
    }

    with SYSTEM_LOG.open("a", encoding="utf-8") as f:
        f.write(json.dumps(item, ensure_ascii=False) + "\n")

    return item


def load_logs(limit=100):
    if not SYSTEM_LOG.exists():
        return []

    lines = SYSTEM_LOG.read_text(encoding="utf-8", errors="ignore").splitlines()
    rows = []

    for line in lines[-limit:]:
        try:
            rows.append(json.loads(line))
        except Exception:
            rows.append({"time": now(), "kind": "raw", "detail": line})

    return rows


def load_history(session_id, limit=20):
    path = history_path(session_id)
    data = read_json(path, [])

    if not isinstance(data, list):
        return []

    return data[-limit:]


def save_turn(
    session_id,
    user_text=None,
    krxa_text=None,
    service="free",
    cards=None,
    mode="interpreter",
    **kwargs
):
    if user_text is None:
        user_text = kwargs.get("text", "")

    if krxa_text is None:
        krxa_text = kwargs.get("result", "")

    path = history_path(session_id)
    data = read_json(path, [])

    if not isinstance(data, list):
        data = []

    item = {
        "time": now(),
        "session_id": session_id,
        "service": service,
        "mode": mode,
        "user": user_text,
        "krxa": krxa_text,
        "cards": cards or []
    }

    data.append(item)
    write_json(path, data)

    log_event("turn_saved", {
        "session_id": session_id,
        "service": service,
        "mode": mode,
        "user_len": len(user_text or ""),
        "krxa_len": len(krxa_text or "")
    })

    return item


def clear_history(session_id):
    path = history_path(session_id)

    if path.exists():
        path.unlink()

    log_event("history_cleared", {
        "session_id": session_id
    })


def save_stt_result(
    ok,
    text="",
    reason="",
    audio_size=0,
    duration=0,
    content_type="",
    session_id="",
    device=""
):
    kind = "stt_result" if ok else "stt_fail"

    return log_event(kind, {
        "ok": ok,
        "text": text,
        "reason": reason,
        "audio_size": audio_size,
        "duration": duration,
        "content_type": content_type,
        "session_id": session_id,
        "device": device
    })


def save_tts_result(
    ok,
    text_len=0,
    audio_size=0,
    reason="",
    session_id=""
):
    kind = "tts_result" if ok else "tts_fail"

    return log_event(kind, {
        "ok": ok,
        "text_len": text_len,
        "audio_size": audio_size,
        "reason": reason,
        "session_id": session_id
    })


def stats():
    logs = load_logs(500)

    total_stt = len([x for x in logs if x.get("kind") in ["stt_result", "stt_fail"]])
    stt_fail = len([x for x in logs if x.get("kind") == "stt_fail"])
    turns = len([x for x in logs if x.get("kind") == "turn_saved"])

    return {
        "turns": turns,
        "stt_total": total_stt,
        "stt_fail": stt_fail,
        "stt_fail_rate": round(stt_fail / total_stt, 3) if total_stt else 0
    }