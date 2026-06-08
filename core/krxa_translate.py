import os
import time
from openai import OpenAI

from core.krxa_store import (
    new_id,
    load_history,
    save_turn,
    log_event
)

client = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))
MODEL = os.getenv("OPENAI_TEXT_MODEL", "gpt-4o-mini")


TRANSLATE_ONLY_PROMPT = """
[KRXA TRAVEL V1 - TRANSLATE ONLY MODE]

You are not a travel agent.
You are not an assistant.
You do not recommend places.
You do not answer questions as KRXA.
You do not explain.
You only translate the user's utterance into the counterpart language.

Core rule:
- Output translation only.
- Do not add greetings unless they are in the source.
- Do not add advice.
- Do not add recommendations.
- Do not answer the question.
- Translate the question itself.

Direction rule:
- If input is Korean, translate naturally into the selected target language.
- If input is the selected target language, translate naturally into Korean.
- If input is another language, translate naturally into Korean unless target language is clearer.
- Short phrases must be translated naturally.

Important examples:
Input Korean: 맛집이 어디야?
Output English: Where is a good restaurant?

Input Korean: 호텔 예약을 확인하고 싶어요.
Output English: I would like to check my hotel reservation.

Input English: Where is the nearest station?
Output Korean: 가장 가까운 역이 어디인가요?

Do not output:
- "Here are some restaurants..."
- "I recommend..."
- "KRXA says..."
- "As a travel assistant..."
- Any explanation.

Output length:
- 1 to 2 sentences only.
"""


LANGUAGE_NAMES = {
    "auto": "the counterpart language",
    "en": "English",
    "ja": "Japanese",
    "zh": "Chinese",
    "fr": "French",
    "de": "German",
    "es": "Spanish",
    "it": "Italian",
    "vi": "Vietnamese",
    "th": "Thai",
    "id": "Indonesian",
    "ru": "Russian",
    "ko": "Korean"
}


def translate_only(
    text,
    session_id="",
    service="free",
    source="text",
    device_locale="",
    location_text="",
    lat="",
    lng="",
    target_language="auto"
):
    started = time.time()

    if not session_id:
        session_id = new_id("session")

    target_language = (target_language or "auto").strip().lower()
    target_name = LANGUAGE_NAMES.get(target_language, target_language)


    messages = [
        {"role": "system", "content": TRANSLATE_ONLY_PROMPT},
        {
            "role": "system",
            "content": (
                "Selected counterpart language: "
                + target_name
                + ". If the user's input is Korean, translate to this language. "
                + "If the user's input is this language, translate to Korean. "
                + "Never answer the question. Translate only."
            )
        }
    ]

    if device_locale:
        messages.append({
            "role": "system",
            "content": f"device_locale_reference_only: {device_locale}"
        })

    if location_text:
        messages.append({
            "role": "system",
            "content": f"user_spoken_location_reference_only: {location_text}"
        })

    if lat and lng:
        messages.append({
            "role": "system",
            "content": f"gps_reference_only_do_not_recommend_places: {lat},{lng}"
        })


    messages.append({"role": "user", "content": text})

    try:
        if not os.getenv("OPENAI_API_KEY"):
            result = text
        else:
            response = client.chat.completions.create(
                model=MODEL,
                messages=messages,
                temperature=0.0,
                max_tokens=80
            )
            result = response.choices[0].message.content.strip()

    except Exception as e:
        result = "Translation error: " + str(e)

    save_turn(
        session_id=session_id + "_translate",
        user_text=text,
        krxa_text=result,
        service=service,
        cards=[],
        mode="translate_only"
    )

    elapsed = round(time.time() - started, 3)

    log_event(
        "translate_only",
        {
            "session_id": session_id,
            "source": source,
            "target_language": target_language,
            "elapsed": elapsed
        }
    )

    return {
        "ok": True,
        "result": result,
        "cards": [],
        "session_id": session_id,
        "mode": "translate_only",
        "source": source,
        "target_language": target_language,
        "elapsed": elapsed
    }