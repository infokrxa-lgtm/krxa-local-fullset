import json
from pathlib import Path
from datetime import datetime
from uuid import uuid4

BASE = Path("storage")
HISTORY_DIR = BASE / "history"
CONFIG_PATH = BASE / "config.json"
LOG_DIR = Path("logs")
SYSTEM_LOG = LOG_DIR / "system.log"

HISTORY_DIR.mkdir(parents=True, exist_ok=True)
LOG_DIR.mkdir(parents=True, exist_ok=True)


def now():
    return datetime.now().strftime("%Y-%m-%d %H:%M:%S")


def new_id(prefix="id"):
    return f"{prefix}-{uuid4().hex[:12]}"


def read_json(path, default):
    path = Path(path)

    try:
        if path.exists():
            return json.loads(
                path.read_text(
                    encoding="utf-8"
                )
            )
    except Exception:
        pass

    return default


def write_json(path, data):
    path = Path(path)
    path.parent.mkdir(
        parents=True,
        exist_ok=True
    )

    path.write_text(
        json.dumps(
            data,
            ensure_ascii=False,
            indent=2
        ),
        encoding="utf-8"
    )


def history_path(session_id):
    safe = (
        session_id
        .replace("/", "_")
        .replace("\\", "_")
    )

    return HISTORY_DIR / f"{safe}.json"


def log_event(kind, detail=None):
    item = {
        "time": now(),
        "kind": kind,
        "detail": detail or {}
    }

    with SYSTEM_LOG.open(
        "a",
        encoding="utf-8"
    ) as f:
        f.write(
            json.dumps(
                item,
                ensure_ascii=False
            ) + "\n"
        )

    return item


def load_logs(limit=100):
    if not SYSTEM_LOG.exists():
        return []

    lines = SYSTEM_LOG.read_text(
        encoding="utf-8",
        errors="ignore"
    ).splitlines()

    rows = []

    for line in lines[-limit:]:
        try:
            rows.append(json.loads(line))
        except Exception:
            rows.append({
                "time": now(),
                "kind": "raw",
                "detail": line
            })

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

    log_event(
        "turn_saved",
        {
            "session_id": session_id,
            "service": service,
            "mode": mode,
            "user_len": len(user_text or ""),
            "krxa_len": len(krxa_text or "")
        }
    )

    return item


def clear_history(session_id):
    path = history_path(session_id)

    if path.exists():
        path.unlink()

    log_event(
        "history_cleared",
        {
            "session_id": session_id
        }
    )


def save_stt_result(
    ok,
    text="",
    reason="",
    audio_size=0,
    duration=0,
    content_type="",
    session_id="",
    device="",
    language_hint="auto"
):
    kind = "stt_result" if ok else "stt_fail"

    return log_event(
        kind,
        {
            "ok": ok,
            "text": text,
            "reason": reason,
            "audio_size": audio_size,
            "duration": duration,
            "content_type": content_type,
            "session_id": session_id,
            "device": device,
            "language_hint": language_hint
        }
    )


def save_tts_result(
    ok,
    text_len=0,
    audio_size=0,
    reason="",
    session_id=""
):
    kind = "tts_result" if ok else "tts_fail"

    return log_event(
        kind,
        {
            "ok": ok,
            "text_len": text_len,
            "audio_size": audio_size,
            "reason": reason,
            "session_id": session_id
        }
    )


def get_default_config():
    return {
        "voice_mode": "stable_recording",
        "interpreter_default": True,
        "vad": {
            "enabled": False,
            "mode": "engine",
            "min_audio_size": 1500,
            "min_duration": 0.7,
            "max_duration": 12.0,
            "block_noise_text": True
        },
        "learning": {
            "language_hint": "auto",
            "prefer_korean_for_short_utterance": True,
            "noise_filter_add": [],
            "vad_recommendation": "stable_recording",
            "auto_apply": False
        }
    }


def load_config():
    default = get_default_config()
    saved = read_json(CONFIG_PATH, {})

    if isinstance(saved, dict):
        default.update(saved)

    default.setdefault("vad", get_default_config()["vad"])
    default.setdefault("learning", get_default_config()["learning"])

    return default


def save_config(config):
    write_json(CONFIG_PATH, config)
    log_event("config_saved", config)
    return config


def stats():
    logs = load_logs(1000)

    turns = len([
        x for x in logs
        if x.get("kind") in [
            "turn_saved",
            "turn_routed"
        ]
    ])

    stt_total = len([
        x for x in logs
        if x.get("kind") in [
            "stt_result",
            "stt_fail"
        ]
    ])

    stt_fail = len([
        x for x in logs
        if x.get("kind") == "stt_fail"
    ])

    tts_total = len([
        x for x in logs
        if x.get("kind") in [
            "tts_result",
            "tts_fail"
        ]
    ])

    tts_fail = len([
        x for x in logs
        if x.get("kind") == "tts_fail"
    ])

    return {
        "turns": turns,
        "stt_total": stt_total,
        "stt_fail": stt_fail,
        "stt_fail_rate": round(stt_fail / stt_total, 3) if stt_total else 0,
        "tts_total": tts_total,
        "tts_fail": tts_fail,
        "tts_fail_rate": round(tts_fail / tts_total, 3) if tts_total else 0
    }