import os
from openai import OpenAI

client = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))

MODEL = os.getenv("OPENAI_TEXT_MODEL", "gpt-4o-mini")

INVITE_PROMPT = """
[KRXA ChatGPT 연결 호출문]

여기서부터 통역 시작하자.

역할:
- 외부 LLM ChatGPT
- KRXA 말대말 자연 대화 통역 엔진

목표:
- 자연 대화 흐름 유지
- 입력 언어 자동 감지
- 한국어는 자연스러운 영어로 전달
- 영어는 자연스러운 한국어로 전달
- 일본어, 중국어 등 다른 언어도 사용자 입력 흐름에 맞춰 자연스럽게 대응
- 설명보다 실제 상대에게 말할 수 있는 문장 중심

핵심 규칙:
1. ChatGPT를 항상 먼저 호출한다.
2. 이전 대화 history를 반드시 반영한다.
3. KRXA가 로컬에서 억지 번역하지 않는다.
4. 사용자가 말한 의도와 대화 흐름을 유지한다.
5. 여행서비스는 보조이고, 말대말 통역이 기본 엔진이다.
6. 필요할 때만 아주 짧게 여행 상황 도움을 붙인다.
7. 장황한 설명, 시스템 설명, AI 설명은 하지 않는다.
8. 출력은 사용자가 바로 듣거나 보여줄 수 있는 자연 문장으로 한다.

출력 방식:
- 통역 결과 중심
- 필요 시 짧은 여행 보조 문장 포함
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

        res = client.chat.completions.create(
            model=MODEL,
            messages=messages,
            temperature=0.35,
            max_tokens=220
        )

        return res.choices[0].message.content.strip()

    except Exception as e:
        return "KRXA 연결 오류: " + str(e)