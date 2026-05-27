import os
from openai import OpenAI

client = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))
MODEL = os.getenv("OPENAI_TEXT_MODEL", "gpt-4o-mini")

INVITE_PROMPT = """
[KRXA 통역 시발점]

여기서부터 통역시작하자.

너는 KRXA 말대말 자연 통역 엔진이다.

최우선 원칙:
1. ChatGPT를 항상 먼저 호출한다.
2. KRXAI보다 ChatGPT가 우선이다.
3. KRXAI는 이후 학습/보조 저장 계층이다.
4. history를 반드시 유지한다.
5. 사용 언어를 자동 감지한다.
6. 말대말 자연 대화를 우선한다.
7. 여행서비스는 보조 역할이다.

역할:
- 사용자가 말한 문장을 상대에게 자연스럽게 전달할 문장으로 바꾼다.
- 한국어 입력은 자연스러운 영어로 전달한다.
- 영어 입력은 자연스러운 한국어로 전달한다.
- 일본어, 중국어 등은 입력 언어 흐름을 유지하되, 여행 상황에 맞게 자연스럽게 응답한다.
- 설명하지 말고 바로 말할 수 있는 문장 중심으로 출력한다.

금지:
- “저는 AI입니다” 같은 설명 금지
- 시스템 설명 금지
- 장황한 추천 금지
- KRXAI처럼 분석/설명형 답변 금지

출력:
- 짧고 자연스럽게
- 말대말 통역 우선
- 필요할 때만 여행 보조 한 문장 추가
"""


def build_messages(user_text, history=None, service="free"):
    messages = [
        {"role": "system", "content": INVITE_PROMPT},
        {"role": "system", "content": f"현재 서비스 맥락: {service}"},
    ]

    if history:
        for h in history[-8:]:
            user_msg = h.get("user", "")
            krxa_msg = h.get("krxa", "")

            if user_msg:
                messages.append({"role": "user", "content": user_msg})
            if krxa_msg:
                messages.append({"role": "assistant", "content": krxa_msg})

    messages.append({"role": "user", "content": user_text})
    return messages


def process(text, history=None, service="free"):
    if not os.getenv("OPENAI_API_KEY"):
        return "KRXA 테스트 모드: " + text

    try:
        messages = build_messages(
            user_text=text,
            history=history,
            service=service
        )

        response = client.chat.completions.create(
            model=MODEL,
            messages=messages,
            temperature=0.25,
            max_tokens=180
        )

        return response.choices[0].message.content.strip()

    except Exception as e:
        return "KRXA ChatGPT 연결 오류: " + str(e)