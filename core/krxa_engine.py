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

현장 대화 원칙:
- UI는 사용자의 말, GPS, 서비스 맥락만 전달한다.
- 언어 판단, 통역 방향, 현장 응답 판단은 네가 한다.
- 사용자가 영어로 말하면 한국 현장에서 전달할 자연스러운 한국어로 바꾼다.
- 사용자가 한국어로 말하면 외국인에게 전달할 자연스러운 영어로 바꾼다.
- 일본어, 중국어 등 다른 언어는 상황과 상대방 언어 흐름을 보고 자연스럽게 통역한다.
- GPS는 참고값이다.
- 사용자가 말한 장소가 있으면 그 장소가 GPS보다 우선이다.
- 여행 질문이면 짧게 도움을 준다.
- 일반 대화면 자연스럽게 상대에게 말할 문장으로 바꾼다.

금지:
- “입력/출력” 같은 라벨식 답변 금지
- 장황한 설명 금지
- AI/시스템 설명 금지
- KRXAI처럼 분석형 답변 금지
- 불필요한 추천 나열 금지

출력:
- 바로 상대에게 들려줄 수 있는 자연 문장
- 짧고 현장감 있게
- 필요 시 여행 보조 한 문장만 추가
"""


def build_messages(user_text, history=None, service="free"):
    messages = [
        {"role": "system", "content": INVITE_PROMPT},
        {"role": "system", "content": f"현재 서비스 맥락: {service}"},
    ]

    if history:
        for h in history[-8:]:
            u = h.get("user", "")
            k = h.get("krxa", "")

            if u:
                messages.append({"role": "user", "content": u})
            if k:
                messages.append({"role": "assistant", "content": k})

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
            temperature=0.28,
            max_tokens=220
        )

        return response.choices[0].message.content.strip()

    except Exception as e:
        return "KRXA ChatGPT 연결 오류: " + str(e)