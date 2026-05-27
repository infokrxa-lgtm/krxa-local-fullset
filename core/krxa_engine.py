import os
from openai import OpenAI

client = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))
MODEL = os.getenv("OPENAI_TEXT_MODEL", "gpt-4o-mini")


BASE_PROMPT = """
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

공통 원칙:
- UI는 사용자의 말, GPS, 서비스 맥락만 전달한다.
- 언어 판단, 통역 방향, 현장 응답 판단은 네가 한다.
- GPS는 참고값이다.
- 사용자가 말한 장소가 있으면 그 장소가 GPS보다 우선이다.
- 사용자가 직접 말하지 않은 장소/목적지를 멋대로 추가하지 않는다.
- 장황하게 설명하지 않는다.
"""


INTERPRETER_PROMPT = """
[무료 통역 모드]

역할:
- KRXA는 대화 당사자가 아니다.
- 한 사람의 말을 상대방이 이해할 언어로 자연스럽게 바꾼다.
- 답변하지 말고 통역한다.
- 추천/판단/설명은 하지 않는다.

방향:
- 한국어 입력 → 외국인이 들을 자연스러운 영어 중심.
- 영어 입력 → 한국 현장에서 들려줄 자연스러운 한국어 중심.
- 일본어/중국어 등은 상황과 history를 보고 상대방 언어로 자연스럽게 통역한다.

출력:
- 상대에게 바로 들려줄 문장만.
- “입력/출력” 라벨 금지.
- “제가 도와드릴게요” 같은 KRXA 당사자 표현 금지.
"""


AGENCY_PROMPT = """
[여행 에이전시 모드]

역할:
- KRXA가 여행 도우미로 직접 응답한다.
- 맛집, 길찾기, 숙소, 예약, 긴급상황, 관광 안내를 돕는다.
- 향후 유료 모드로 분리될 기능이다.

출력:
- 짧고 실용적으로 답한다.
- 위치 정보가 있으면 참고한다.
- 지도/카드는 별도 UI가 담당하므로 답변은 간결하게 한다.
"""


def build_messages(user_text, history=None, service="free", mode="interpreter"):
    mode_prompt = INTERPRETER_PROMPT
    if mode == "agency":
        mode_prompt = AGENCY_PROMPT

    messages = [
        {"role": "system", "content": BASE_PROMPT},
        {"role": "system", "content": mode_prompt},
        {"role": "system", "content": f"현재 서비스 맥락: {service}"},
        {"role": "system", "content": f"현재 모드: {mode}"},
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


def process(text, history=None, service="free", mode="interpreter"):
    if not os.getenv("OPENAI_API_KEY"):
        return "KRXA 테스트 모드: " + text

    try:
        messages = build_messages(
            user_text=text,
            history=history,
            service=service,
            mode=mode
        )

        response = client.chat.completions.create(
            model=MODEL,
            messages=messages,
            temperature=0.25 if mode == "interpreter" else 0.45,
            max_tokens=180 if mode == "interpreter" else 260
        )

        return response.choices[0].message.content.strip()

    except Exception as e:
        return "KRXA ChatGPT 연결 오류: " + str(e)