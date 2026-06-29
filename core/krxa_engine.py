import os
from openai import OpenAI


# PATCH68_OPENAI_MESSAGE_SANITIZER_START
def sanitize_openai_messages(messages):
    """
    OpenAI Chat Completions messages sanitizer.
    content는 string 또는 array만 허용된다.
    dict/object가 들어오면 JSON 문자열로 변환한다.
    """
    import json as _json

    safe = []
    if messages is None:
        return []

    for m in messages:
        if not isinstance(m, dict):
            safe.append({"role": "user", "content": str(m)})
            continue

        role = m.get("role") or "user"
        content = m.get("content", "")

        if content is None:
            content = ""
        elif isinstance(content, str):
            pass
        elif isinstance(content, list):
            try:
                for item in content:
                    if not isinstance(item, dict):
                        raise TypeError("non-dict item in content list")
            except Exception:
                content = _json.dumps(content, ensure_ascii=False, default=str)
        elif isinstance(content, dict):
            content = _json.dumps(content, ensure_ascii=False, default=str)
        else:
            content = str(content)

        safe_msg = {"role": str(role), "content": content}

        for k in ("name", "tool_call_id"):
            if k in m and m[k] is not None:
                safe_msg[k] = str(m[k])

        safe.append(safe_msg)

    return safe
# PATCH68_OPENAI_MESSAGE_SANITIZER_END


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
- 짧고 자연스럽게 답한다.
- 목록, 번호, 마크다운, 굵은 글씨를 쓰지 않는다.
"""


INTERPRETER_PROMPT = """
[무료 통역 모드]

KRXA는 대화 당사자가 아니다.
한 사람의 말을 상대방 언어로 자연스럽게 바꾼다.
답변하지 말고 통역한다.
추천/판단/설명은 하지 않는다.

한국어 입력 → 외국인이 들을 자연스러운 영어.
영어 입력 → 한국 현장에서 들려줄 자연스러운 한국어.
일본어/중국어 등 기타 언어 → history와 상황을 보고 상대방 언어로 자연 통역.

출력은 상대에게 바로 들려줄 문장만.
최대 1~2문장.
"""


AGENCY_PROMPT = """
[여행 에이전시 모드]

KRXA가 여행 도우미로 직접 응답한다.
맛집, 길찾기, 숙소, 예약, 관광 안내를 돕는다.
향후 유료 모드로 분리될 기능이다.

출력 규칙:
- 최대 2문장.
- 추천은 1개만 먼저 제시.
- 위치가 불명확하면 짧게 되묻기.
- 목록/번호/마크다운 금지.
- 답변 끝에 필요하면 짧은 질문 1개만.
"""


def build_messages(user_text, history=None, service="free", mode="interpreter"):
    mode_prompt = AGENCY_PROMPT if mode == "agency" else INTERPRETER_PROMPT

    messages = [
        {"role": "system", "content": BASE_PROMPT},
        {"role": "system", "content": mode_prompt},
        {"role": "system", "content": f"현재 서비스 맥락: {service}"},
        {"role": "system", "content": f"현재 모드: {mode}"},
    ]

    if history:
        for h in history[-6:]:
            u = h.get("user", "")
            k = h.get("krxa", "")

            if u:
                messages.append({"role": "user", "content": u})

            if k:
                messages.append({"role": "assistant", "content": k})

    messages.append({"role": "user", "content": user_text})

    return messages



# PATCH69_SAFE_BUILD_MESSAGES_START
def safe_build_messages(*args, **kwargs):
    """build_messages 결과를 OpenAI 호출 직전에 sanitize한다."""
    return sanitize_openai_messages(build_messages(*args, **kwargs))
# PATCH69_SAFE_BUILD_MESSAGES_END

def process(text, history=None, service="free", mode="interpreter"):
    if not os.getenv("OPENAI_API_KEY"):
        return "KRXA 테스트 모드: " + text

    try:
        response = client.chat.completions.create(
            model=MODEL,
            messages=safe_build_messages(
                user_text=text,
                history=history,
                service=service,
                mode=mode
            ),
            temperature=0.2 if mode == "interpreter" else 0.35,
            max_tokens=90 if mode == "interpreter" else 120
        )

        return response.choices[0].message.content.strip()

    except Exception as e:
        return "KRXA ChatGPT 연결 오류: " + str(e)