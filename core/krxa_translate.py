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
[KRXA 오직 통역 루트]

너는 KRXA 무료 통역 전용 엔진이다.

절대 원칙:
- 답변하지 않는다.
- 추천하지 않는다.
- 설명하지 않는다.
- 여행 에이전시처럼 행동하지 않는다.
- 사용자의 말을 상대방이 이해할 언어로만 바꾼다.

방향:
- 한국어 입력 → 자연스러운 영어.
- 영어 입력 → 자연스러운 한국어.
- 일본어/중국어/기타 언어 → 대화 흐름상 상대방 언어로 자연스럽게 통역.
- 짧은 말도 그대로 자연스럽게 통역.

출력:
- 통역문만 출력.
- “KRXA”, “입력”, “출력”, “번역:” 같은 라벨 금지.
- 최대 1~2문장.
"""


def translate_only(
    text,
    session_id="",
    service="free",
    source="text",
    device_locale="",
    location_text="",
    lat="",
    lng=""
):
    started = time.time()

    if not session_id:
        session_id = new_id("session")

    history = load_history(
        session_id + "_translate",
        limit=6
    )

    messages = [
        {"role": "system", "content": TRANSLATE_ONLY_PROMPT}
    ]

    if device_locale:
        messages.append({
            "role": "system",
            "content": f"device_locale: {device_locale}"
        })

    if location_text:
        messages.append({
            "role": "system",
            "content": f"user_spoken_location_reference: {location_text}"
        })

    if lat and lng:
        messages.append({
            "role": "system",
            "content": f"gps_reference_only: {lat},{lng}"
        })

    for h in history[-4:]:
        u = h.get("user", "")
        k = h.get("krxa", "")

        if u:
            messages.append({"role": "user", "content": u})
        if k:
            messages.append({"role": "assistant", "content": k})

    messages.append({"role": "user", "content": text})

    try:
        if not os.getenv("OPENAI_API_KEY"):
            result = "KRXA 테스트 통역: " + text
        else:
            response = client.chat.completions.create(
                model=MODEL,
                messages=messages,
                temperature=0.15,
                max_tokens=80
            )
            result = response.choices[0].message.content.strip()

    except Exception as e:
        result = "KRXA 통역 연결 오류: " + str(e)

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
        "elapsed": elapsed
    }