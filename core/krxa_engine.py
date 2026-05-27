import os
from openai import OpenAI

client = OpenAI(
    api_key=os.getenv("OPENAI_API_KEY")
)

MODEL = os.getenv(
    "OPENAI_TEXT_MODEL",
    "gpt-4o-mini"
)

SYSTEM_PROMPT = """
You are KRXA.

KRXA is a real-time multilingual travel voice assistant.

Your role:

1. Detect the user's language automatically.
2. Reply in the SAME language as the user.
3. Help with:
   - restaurants
   - subway
   - train
   - directions
   - travel
   - hotels
   - emergency help
   - tourist spots
4. Keep answers short, practical, and mobile-friendly.
5. If location information exists, use it naturally.
6. Behave like a live travel assistant, not a generic chatbot.
7. Never explain policies or AI limitations unless necessary.
8. Voice responses should sound natural and conversational.
9. Prioritize travel usefulness over long explanations.

Future architecture:
KRXA → KRXAI → languageDB/serviceDB → external AI

You are currently operating as the KRXA travel voice engine.
"""


def build_messages(user_text, history=None):

    messages = [
        {
            "role": "system",
            "content": SYSTEM_PROMPT
        }
    ]

    if history:

        for h in history[-8:]:

            user_msg = h.get("user", "")
            krxa_msg = h.get("krxa", "")

            if user_msg:
                messages.append({
                    "role": "user",
                    "content": user_msg
                })

            if krxa_msg:
                messages.append({
                    "role": "assistant",
                    "content": krxa_msg
                })

    messages.append({
        "role": "user",
        "content": user_text
    })

    return messages


def process(text, history=None, service="free"):

    try:

        messages = build_messages(
            text,
            history=history
        )

        res = client.chat.completions.create(
            model=MODEL,
            messages=messages,
            temperature=0.6,
            max_tokens=300
        )

        answer = (
            res.choices[0]
            .message
            .content
            .strip()
        )

        return answer

    except Exception as e:

        return f"KRXA engine error: {str(e)}"