from core.krxa_store import read_json, log_event


VOICE_FILTER_CONFIG = "storage/voice_filter_config.json"
TURN_CONFIG = "storage/turn_config.json"


def load_voice_filter_config():
    return read_json(VOICE_FILTER_CONFIG, {
        "enabled": True,
        "mode": "monitor_only",
        "background_patterns": []
    })


def load_turn_config():
    return read_json(TURN_CONFIG, {
        "enabled": True,
        "mode": "monitor_only",
        "min_text_length": 2,
        "continue_patterns": [],
        "complete_patterns": []
    })


def contains_any(text, patterns):
    low = (text or "").lower()
    return any(str(p).lower() in low for p in patterns or [])


def judge_background(text, config):
    if not config.get("enabled", True):
        return {
            "is_background": False,
            "mode": "off",
            "matched": "",
            "action": "pass"
        }

    patterns = config.get("background_patterns", [])

    for p in patterns:
        if str(p).lower() in (text or "").lower():
            action = "block" if config.get("mode") == "block" else "monitor"
            return {
                "is_background": True,
                "mode": config.get("mode", "monitor_only"),
                "matched": p,
                "action": action
            }

    return {
        "is_background": False,
        "mode": config.get("mode", "monitor_only"),
        "matched": "",
        "action": "pass"
    }


def judge_turn_state(text, config):
    clean = (text or "").strip()

    if not config.get("enabled", True):
        return {
            "turn_state": "unknown",
            "pause_state": "not_checked",
            "should_call_llm": True,
            "reason": "turn_engine_off",
            "score": 0
        }

    if not clean:
        return {
            "turn_state": "empty",
            "pause_state": "empty",
            "should_call_llm": False,
            "reason": "empty_text",
            "score": -10
        }

    min_len = int(config.get("min_text_length", 2))

    if len(clean) < min_len:
        return {
            "turn_state": "too_short",
            "pause_state": "uncertain",
            "should_call_llm": False,
            "reason": "too_short",
            "score": -5
        }

    continue_patterns = config.get("continue_patterns", [])
    complete_patterns = config.get("complete_patterns", [])

    score = 0
    reasons = []

    if contains_any(clean, continue_patterns):
        score -= 5
        reasons.append("continue_pattern")

    if contains_any(clean, complete_patterns):
        score += 5
        reasons.append("complete_pattern")

    if clean.endswith(("는데", "근데", "그리고", "그래서", "그러니까", "...")):
        score -= 4
        reasons.append("continuing_ending")

    if clean.endswith(("요", "다", "까", "죠", "나요", "세요", "?")):
        score += 2
        reasons.append("possible_completion_ending")

    if len(clean) >= 4:
        score += 1
        reasons.append("enough_length")

    if score >= 3:
        return {
            "turn_state": "complete",
            "pause_state": "turn_complete",
            "should_call_llm": True,
            "reason": ",".join(reasons) or "complete",
            "score": score
        }

    if score <= -2:
        return {
            "turn_state": "continue",
            "pause_state": "thinking_or_continuing",
            "should_call_llm": False,
            "reason": ",".join(reasons) or "continue",
            "score": score
        }

    return {
        "turn_state": "uncertain",
        "pause_state": "hold",
        "should_call_llm": False,
        "reason": ",".join(reasons) or "uncertain",
        "score": score
    }


def analyze_turn(text, session_id="", source="stt", context=None):
    context = context or {}

    voice_filter = load_voice_filter_config()
    turn_config = load_turn_config()

    bg = judge_background(text, voice_filter)
    turn = judge_turn_state(text, turn_config)

    should_block = (
        bg.get("is_background")
        and bg.get("action") == "block"
    )

    if should_block:
        turn["should_call_llm"] = False
        turn["turn_state"] = "background"
        turn["pause_state"] = "blocked"
        turn["reason"] = "background_blocked:" + str(bg.get("matched", ""))

    result = {
        "text": text,
        "session_id": session_id,
        "source": source,
        "background": bg,
        "turn": turn,
        "should_call_llm": bool(turn.get("should_call_llm")),
        "flow_signal": build_flow_signal(bg, turn)
    }

    log_event("turn_analyzed", result)

    return result


def build_flow_signal(background, turn):
    if background.get("is_background"):
        if background.get("action") == "block":
            return "배경음 차단"
        return "배경음 감시 중"

    state = turn.get("turn_state")

    if state == "complete":
        return "발화 완료 · 응답 준비"
    if state == "continue":
        return "계속 듣는 중"
    if state == "uncertain":
        return "흐름 유지 중"
    if state == "too_short":
        return "짧은 발화 감지"
    if state == "empty":
        return "입력 없음"

    return "판단 중"