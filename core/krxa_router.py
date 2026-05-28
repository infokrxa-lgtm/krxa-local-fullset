import time

from core.krxa_engine import process
from core.krxa_travel import get_cards
from core.krxa_store import (
    new_id,
    load_history,
    save_turn,
    log_event
)


def build_context(
    text,
    service="free",
    mode="interpreter",
    source="text",
    location_text="",
    lat="",
    lng="",
    device_locale="",
    extra_context=""
):
    context = []

    context.append("[KRXA_ROUTER_CONTEXT]")
    context.append(f"service: {service}")
    context.append(f"mode: {mode}")
    context.append(f"source: {source}")

    if device_locale:
        context.append(f"device_locale: {device_locale}")

    if location_text:
        context.append(f"user_spoken_location: {location_text}")

    if lat and lng:
        context.append(f"device_gps_reference: {lat},{lng}")

    if extra_context:
        context.append(f"extra_context: {extra_context}")

    context.append("rule: GPS is reference only.")
    context.append("rule: user spoken location has priority over GPS.")
    context.append("rule: app UI does not decide language direction.")
    context.append("rule: engine decides natural speech direction.")
    context.append("[/KRXA_ROUTER_CONTEXT]")

    return text + "\n\n" + "\n".join(context)


def route_turn(
    text,
    service="free",
    session_id="",
    mode="interpreter",
    source="text",
    location_text="",
    lat="",
    lng="",
    device_locale="",
    extra_context=""
):
    started = time.time()

    if not session_id:
        session_id = new_id("session")

    safe_mode = mode if mode in ["interpreter", "agency"] else "interpreter"

    history = load_history(
        session_id=session_id,
        limit=12
    )

    routed_text = build_context(
        text=text,
        service=service,
        mode=safe_mode,
        source=source,
        location_text=location_text,
        lat=lat,
        lng=lng,
        device_locale=device_locale,
        extra_context=extra_context
    )

    result = process(
        text=routed_text,
        history=history,
        service=service,
        mode=safe_mode
    )

    cards = get_cards(
        text,
        service
    )

    save_turn(
        session_id=session_id,
        user_text=text,
        krxa_text=result,
        service=service,
        cards=cards,
        mode=safe_mode
    )

    elapsed = round(
        time.time() - started,
        3
    )

    log_event(
        "turn_routed",
        {
            "session_id": session_id,
            "service": service,
            "mode": safe_mode,
            "source": source,
            "elapsed": elapsed,
            "has_location_text": bool(location_text),
            "has_gps": bool(lat and lng)
        }
    )

    return {
        "ok": True,
        "result": result,
        "cards": cards,
        "session_id": session_id,
        "mode": safe_mode,
        "source": source,
        "elapsed": elapsed
    }