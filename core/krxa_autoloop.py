from core.krxa_store import read_json, write_json, load_logs, log_event

AUTO_EVENTS_PATH = "storage/auto_programming_events.json"
CANDIDATES_PATH = "storage/improve_candidates.json"
VERSION_MEMORY_PATH = "storage/version_memory.json"


def load_candidates():
    return read_json(CANDIDATES_PATH, [])


def save_candidates(items):
    write_json(CANDIDATES_PATH, items)
    return items


def load_version_memory():
    return read_json(VERSION_MEMORY_PATH, [])


def add_autoloop_event(kind, detail=None):
    events = read_json(AUTO_EVENTS_PATH, [])

    if not isinstance(events, list):
        events = []

    item = {
        "kind": kind,
        "detail": detail or {}
    }

    events.append(item)
    write_json(AUTO_EVENTS_PATH, events)
    log_event("autoloop_event", item)

    return item


def make_candidate(candidate_type, title, reason, target_file="", suggestion=None):
    return {
        "type": candidate_type,
        "title": title,
        "reason": reason,
        "target_file": target_file,
        "suggestion": suggestion or {},
        "status": "pending"
    }


def analyze_logs_for_candidates(limit=500):
    logs = load_logs(limit)
    candidates = load_candidates()

    existing_titles = set(
        x.get("title", "")
        for x in candidates
        if isinstance(x, dict)
    )

    new_items = []

    for item in logs:
        kind = item.get("kind", "")
        detail = item.get("detail", {}) or {}

        if kind == "turn_analyzed":
            bg = detail.get("background", {}) or {}
            turn = detail.get("turn", {}) or {}

            if bg.get("is_background"):
                title = "배경음 패턴 감지"
                if title not in existing_titles:
                    new_items.append(make_candidate(
                        candidate_type="voice_filter",
                        title=title,
                        reason="STT 결과가 배경음 패턴과 매칭됨",
                        target_file="storage/voice_filter_config.json",
                        suggestion={
                            "mode": "monitor_only",
                            "matched": bg.get("matched", "")
                        }
                    ))

            if turn.get("turn_state") == "uncertain":
                title = "발화 종료 판단 불확실"
                if title not in existing_titles:
                    new_items.append(make_candidate(
                        candidate_type="turn_engine",
                        title=title,
                        reason="발화가 완료/진행 중 어느 쪽인지 불확실함",
                        target_file="storage/turn_config.json",
                        suggestion={
                            "reason": turn.get("reason", ""),
                            "score": turn.get("score", 0)
                        }
                    ))

        if kind == "stt_fail":
            title = "STT 실패 반복 후보"
            if title not in existing_titles:
                new_items.append(make_candidate(
                    candidate_type="stt",
                    title=title,
                    reason="STT 실패 로그가 감지됨",
                    target_file="core/krxa_voice.py",
                    suggestion=detail
                ))

    if new_items:
        candidates.extend(new_items)
        save_candidates(candidates)

    log_event("autoloop_analyzed", {
        "new_candidates": len(new_items),
        "total_candidates": len(candidates)
    })

    return {
        "ok": True,
        "new_candidates": new_items,
        "candidates": candidates
    }


def approve_candidate(index, note=""):
    candidates = load_candidates()

    try:
        item = candidates[int(index)]
    except Exception:
        return {
            "ok": False,
            "reason": "invalid_index"
        }

    item["status"] = "approved"
    item["note"] = note

    memory = load_version_memory()
    memory.append({
        "type": "candidate_approved",
        "candidate": item
    })

    save_candidates(candidates)
    write_json(VERSION_MEMORY_PATH, memory)

    log_event("candidate_approved", item)

    return {
        "ok": True,
        "candidate": item
    }


def hold_candidate(index, note=""):
    candidates = load_candidates()

    try:
        item = candidates[int(index)]
    except Exception:
        return {
            "ok": False,
            "reason": "invalid_index"
        }

    item["status"] = "hold"
    item["note"] = note

    save_candidates(candidates)
    log_event("candidate_hold", item)

    return {
        "ok": True,
        "candidate": item
    }