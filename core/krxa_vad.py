from core.krxa_store import log_event


VAD_DEFAULT_CONFIG = {
    "enabled": False,
    "mode": "engine",
    "min_audio_size": 1500,
    "min_duration": 0.7,
    "max_duration": 12.0,
    "block_noise_text": True
}


BASE_NOISE_WORDS = [
    "inaudible",
    "background",
    "chatter",
    "radio",
    "noise",
    "music",
    "thanks for watching",
    "thank you for watching",
    "시청해주셔서",
    "구독",
    "음",
    "어"
]


def get_vad_config(config=None):
    if not config:
        return dict(VAD_DEFAULT_CONFIG)

    if "vad" in config:
        merged = dict(VAD_DEFAULT_CONFIG)
        merged.update(config.get("vad") or {})
        return merged

    merged = dict(VAD_DEFAULT_CONFIG)
    merged.update(config)
    return merged


def get_noise_words(config=None):
    words = list(BASE_NOISE_WORDS)

    if config and "learning" in config:
        extra = config.get("learning", {}).get("noise_filter_add", [])
        if isinstance(extra, list):
            words.extend(extra)

    return list(dict.fromkeys(words))


def is_noise_text(text: str, config=None) -> bool:
    if not text:
        return True

    t = text.strip().lower()

    if len(t) <= 1:
        return True

    return any(w in t for w in get_noise_words(config))


def check_audio(audio_size: int, duration: float, config=None):
    cfg = get_vad_config(config)

    if audio_size < cfg.get("min_audio_size", 1500):
        return False, "audio_too_small"

    if duration and duration < cfg.get("min_duration", 0.7):
        return False, "duration_too_short"

    if duration and duration > cfg.get("max_duration", 12.0):
        return False, "duration_too_long"

    return True, "ok"


def check_text(text: str, config=None):
    cfg = get_vad_config(config)

    if not cfg.get("block_noise_text", True):
        return True, "ok"

    if is_noise_text(text, config):
        return False, "noise_or_inaudible"

    return True, "ok"


def log_vad_decision(ok: bool, stage: str, reason: str, detail=None):
    return log_event(
        "vad_pass" if ok else "vad_block",
        {
            "stage": stage,
            "reason": reason,
            "detail": detail or {}
        }
    )