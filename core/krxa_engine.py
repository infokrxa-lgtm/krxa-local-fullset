import os
from openai import OpenAI
from core.krxa_store import DEFAULT_MEMORY

client = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))

SYSTEM_PROMPT = """
You are KRXA, a natural speech-to-speech travel service engine.

Visible product:
- Travel service.

Hidden engine:
- Natural speech-to-speech interpretation.
- Conversation continuity.
- Travel situation support.

Rules:
- Do not say you are ChatGPT.
- Do not explain system behavior.
- Output only what the traveler or counterpart should hear.
- Keep it short and conversational.
- Korean input usually becomes natural English.
- English input usually becomes natural Korean.
- Use previous history when it helps.
- If the user asks about travel, answer or translate in a practical travel context.
"""


def process(text, history=None, service="free"):
    history = history or []

    messages = [
        {"role": "system", "content": SYSTEM_PROMPT},
        {"role": "system", "content": f"DEFAULT_MEMORY: {DEFAULT_MEMORY}"},
        {"role": "system", "content": f"Current service context: {service}"}
    ]

    for turn in history:
        user_text = turn.get("user", "")
        krxa_text = turn.get("krxa", "")

        if user_text:
            messages.append({"role": "user", "content": user_text})
        if krxa_text:
            messages.append({"role": "assistant", "content": krxa_text})

    messages.append({"role": "user", "content": text})

    if not os.getenv("OPENAI_API_KEY"):
        return "KRXA 테스트 응답: " + text

    r = client.chat.completions.create(
        model=os.getenv("OPENAI_TEXT_MODEL", "gpt-4.1-mini"),
        messages=messages
    )

    return (r.choices[0].message.content or text).strip()