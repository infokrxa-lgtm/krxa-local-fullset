import json
import time
import uuid
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent.parent
STORAGE_DIR = BASE_DIR / "storage"
HISTORY_DIR = STORAGE_DIR / "history"
LOG_FILE = STORAGE_DIR / "krxa_logs.json"

STORAGE_DIR.mkdir(exist_ok=True)
HISTORY_DIR.mkdir(exist_ok=True)

DEFAULT_MEMORY = {
    "product": "KRXA 여행 웹/앱",
    "visible_main": "여행서비스",
    "hidden_engine": "자연 말대말 통역",
    "principles": [
        "사용자에게 보이는 주연은 여행서비스다.",
        "말대말 통역은 숨은 엔진으로 자연스럽게 작동한다.",
        "현재 사용자 입력이 최종 판단 기준이다.",
        "서비스는 시작 맥락이고, 카드는 사용자 질문 기반으로 동적으로 제공한다.",
        "단기 기억은 초기화 가능하지만 기본 기억은 유지한다."
    ]
}


def now():
    return time.strftime("%Y-%m-%d %H:%M:%S")


def new_id(prefix="session"):
    return f"{prefix}-{uuid.uuid4().hex[:8]}"


def safe_id(value):
    if not value:
        return new_id("session")
    return "".join(c for c in value if c.isalnum() or c in "-_")[:80]


def history_file(session_id):
    return HISTORY_DIR / f"{safe_id(session_id)}.json"


def load_history(session_id, limit=12):
    path = history_file(session_id)
    if not path.exists():
        return []

    try:
        data = json.loads(path.read_text(encoding="utf-8"))
    except Exception:
        return []

    return data[-limit:]


def save_turn(session_id, user_text, krxa_text, service="free", cards=None):
    path = history_file(session_id)

    history = []
    if path.exists():
        try:
            history = json.loads(path.read_text(encoding="utf-8"))
        except Exception:
            history = []

    item = {
        "time": now(),
        "session_id": safe_id(session_id),
        "service": service,
        "user": user_text,
        "krxa": krxa_text,
        "cards": cards or []
    }

    history.append(item)
    path.write_text(
        json.dumps(history[-100:], ensure_ascii=False, indent=2),
        encoding="utf-8"
    )

    log_event("turn_saved", {
        "session_id": safe_id(session_id),
        "service": service
    })

    return item


def clear_history(session_id):
    path = history_file(session_id)
    if path.exists():
        path.unlink()

    log_event("short_history_cleared", {
        "session_id": safe_id(session_id)
    })

    return True


def log_event(kind, detail=None):
    logs = []

    if LOG_FILE.exists():
        try:
            logs = json.loads(LOG_FILE.read_text(encoding="utf-8"))
        except Exception:
            logs = []

    logs.append({
        "time": now(),
        "kind": kind,
        "detail": detail or {}
    })

    LOG_FILE.write_text(
        json.dumps(logs[-300:], ensure_ascii=False, indent=2),
        encoding="utf-8"
    )


def load_logs(limit=80):
    if not LOG_FILE.exists():
        return []

    try:
        logs = json.loads(LOG_FILE.read_text(encoding="utf-8"))
    except Exception:
        return []

    return logs[-limit:]