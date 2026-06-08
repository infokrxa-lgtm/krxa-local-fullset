from core.krxa_store import log_event


SUPPORTED_LANGUAGES = {
    "auto": "자동",
    "gps": "GPS 기반",
    "ko": "한국어",
    "en": "영어",
    "ja": "일본어",
    "zh": "중국어"
}


def language_from_gps(lat=None, lng=None):
    try:
        lat = float(lat)
        lng = float(lng)
    except Exception:
        return "auto"

    # South Korea
    if 33.0 <= lat <= 39.5 and 124.0 <= lng <= 132.0:
        return "ko"

    # Japan
    if 24.0 <= lat <= 46.5 and 122.0 <= lng <= 146.5:
        return "ja"

    # China broad range
    if 18.0 <= lat <= 54.0 and 73.0 <= lng <= 135.0:
        return "zh"

    # USA broad range
    if 24.0 <= lat <= 49.5 and -125.0 <= lng <= -66.0:
        return "en"

    return "auto"


def normalize_language(value):
    value = (value or "auto").strip().lower()

    if value in SUPPORTED_LANGUAGES:
        return value

    return "auto"


def decide_stt_language(
    user_language_mode="auto",
    lat=None,
    lng=None,
    device_locale="",
    config=None
):
    config = config or {}
    learning = config.get("learning", {}) or {}

    user_language_mode = normalize_language(user_language_mode)

    if user_language_mode in ["ko", "en", "ja", "zh"]:
        if device_locale:
            if device_locale.startswith("ko"):
                result = "ko"
                reason = "device_locale_override_user_selected"
            elif device_locale.startswith("ja"):
                result = "ja"
                reason = "device_locale_override_user_selected"
            elif device_locale.startswith("zh"):
                result = "zh"
                reason = "device_locale_override_user_selected"
            elif device_locale.startswith("en"):
                result = "en"
                reason = "device_locale_override_user_selected"
            else:
                result = "auto"
                reason = "auto_override_user_selected"
        else:
            result = "auto"
            reason = "auto_override_user_selected"
    elif user_language_mode == "gps":
        result = language_from_gps(lat, lng)
        reason = "gps_based"
    else:
        saved_hint = normalize_language(learning.get("language_hint", "auto"))

        if saved_hint in ["ko", "en", "ja", "zh"]:
            result = saved_hint
            reason = "control_config"
        elif device_locale.startswith("ko"):
            result = "ko"
            reason = "device_locale"
        elif device_locale.startswith("ja"):
            result = "ja"
            reason = "device_locale"
        elif device_locale.startswith("zh"):
            result = "zh"
            reason = "device_locale"
        elif device_locale.startswith("en"):
            result = "en"
            reason = "device_locale"
        else:
            gps_lang = language_from_gps(lat, lng)
            result = gps_lang
            reason = "gps_fallback"

    if result not in ["ko", "en", "ja", "zh"]:
        result = "auto"

    detail = {
        "user_language_mode": user_language_mode,
        "result": result,
        "reason": reason,
        "lat": lat,
        "lng": lng,
        "device_locale": device_locale
    }

    log_event("language_decided", detail)

    return result, reason


def display_language(code):
    return SUPPORTED_LANGUAGES.get(code, "자동")