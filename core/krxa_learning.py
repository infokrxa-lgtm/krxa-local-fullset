from collections import Counter

from core.krxa_store import load_logs, log_event


KOREAN_SHORT_WORDS = [
    "네",
    "아니요",
    "안녕",
    "안녕하세요",
    "여기",
    "저기",
    "맛집",
    "길찾기",
    "고마워",
    "감사합니다"
]

JAPANESE_CONFUSION_HINTS = [
    "ね",
    "ねえ",
    "はい",
    "いいえ"
]

DEFAULT_RECOMMENDATION = {
    "language_hint": "auto",
    "prefer_korean_for_short_utterance": True,
    "noise_filter_add": [],
    "vad_recommendation": "stable_recording",
    "stt_action": "keep_logging"
}


def analyze_stt_logs(limit=500):
    logs = load_logs(limit)

    stt_logs = [
        x for x in logs
        if x.get("kind") in ["stt_result", "stt_fail"]
    ]

    total = len(stt_logs)
    fail_logs = [
        x for x in stt_logs
        if x.get("kind") == "stt_fail"
    ]

    success_logs = [
        x for x in stt_logs
        if x.get("kind") == "stt_result"
    ]

    fail_reasons = Counter()
    suspicious_texts = []
    japanese_confusions = []
    short_success = []

    for item in stt_logs:
        detail = item.get("detail", {}) or {}
        reason = detail.get("reason", "")
        text = detail.get("text", "") or ""
        audio_size = detail.get("audio_size", 0)
        duration = detail.get("duration", 0)

        if reason:
            fail_reasons[reason] += 1

        if text:
            clean = text.strip()

            if len(clean) <= 8:
                short_success.append(clean)

            if any(j in clean for j in JAPANESE_CONFUSION_HINTS):
                japanese_confusions.append(clean)

            if (
                "inaudible" in clean.lower()
                or "background" in clean.lower()
                or "chatter" in clean.lower()
                or "radio" in clean.lower()
            ):
                suspicious_texts.append(clean)

        if audio_size and audio_size < 3000:
            fail_reasons["small_audio_candidate"] += 1

        if duration and duration < 1.0:
            fail_reasons["short_duration_candidate"] += 1

    fail_rate = round(len(fail_logs) / total, 3) if total else 0

    recommendation = dict(DEFAULT_RECOMMENDATION)

    if japanese_confusions:
        recommendation["language_hint"] = "ko"
        recommendation["prefer_korean_for_short_utterance"] = True
        recommendation["stt_action"] = "apply_korean_short_hint"

    if fail_reasons.get("noise_or_inaudible", 0) > 0:
        recommendation["noise_filter_add"] = [
            "inaudible",
            "background",
            "chatter",
            "radio"
        ]

    if fail_rate > 0.4:
        recommendation["vad_recommendation"] = "stable_recording"
        recommendation["stt_action"] = "reduce_vad_and_improve_input"

    result = {
        "total": total,
        "success": len(success_logs),
        "fail": len(fail_logs),
        "fail_rate": fail_rate,
        "fail_reasons": dict(fail_reasons),
        "short_success_samples": short_success[-20:],
        "japanese_confusion_samples": japanese_confusions[-20:],
        "suspicious_text_samples": suspicious_texts[-20:],
        "recommendation": recommendation
    }

    log_event("learning_analyzed", result)

    return result


def build_language_hint(text, config=None):
    config = config or {}

    prefer_ko = (
        config.get("prefer_korean_for_short_utterance", True)
        or config.get("language_hint") == "ko"
    )

    if not text:
        return "auto"

    clean = text.strip()

    if prefer_ko and len(clean) <= 8:
        return "ko"

    if any(ch in clean for ch in KOREAN_SHORT_WORDS):
        return "ko"

    return config.get("language_hint", "auto")


def apply_learning_to_config(config, analysis):
    config = config or {}
    analysis = analysis or {}

    rec = analysis.get("recommendation", {})

    if "learning" not in config:
        config["learning"] = {}

    config["learning"]["last_analysis"] = analysis
    config["learning"]["language_hint"] = rec.get("language_hint", "auto")
    config["learning"]["prefer_korean_for_short_utterance"] = rec.get(
        "prefer_korean_for_short_utterance",
        True
    )
    config["learning"]["noise_filter_add"] = rec.get("noise_filter_add", [])
    config["learning"]["vad_recommendation"] = rec.get(
        "vad_recommendation",
        "stable_recording"
    )

    log_event("learning_applied", {
        "language_hint": config["learning"]["language_hint"],
        "vad_recommendation": config["learning"]["vad_recommendation"]
    })

    return config