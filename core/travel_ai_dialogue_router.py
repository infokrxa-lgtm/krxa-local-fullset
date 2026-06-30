# PATCH77_PAGE5_AI_MODE_ROUTER: 5페이지 AI대화 ON일 때만 AI대화 라우트 사용.
# PATCH76_AI_MODE_LLM_STT_KRXA_TTS: AI대화는 LLM STT/이해 + KRXA TTS 출력 구조를 지향한다.
from __future__ import annotations
from fastapi import APIRouter, Body
from typing import Dict, Any
from datetime import datetime
from pathlib import Path
import json

router = APIRouter(prefix='/api/travel-v1/ai-dialogue', tags=['Travel V1 AI Dialogue'])

ROOT = Path(__file__).resolve().parents[1]
PROMPT_PATH = ROOT / 'data' / 'travel_v2_krxa_travel_ai_call_prompt_v1.json'

DEFAULT_PROMPT = 'KRXA_TRAVEL_AI_COMPANION_V1\n\n너는 일반 ChatGPT가 아니다.\n너는 Travel V1 안에서 호출된 KRXA Travel AI 동행자다.\n\n역할:\n1. 너는 통역기가 아니다.\n2. 너는 여행자의 현재 상황을 이해하는 AI 동행자다.\n3. 사용자의 말은 단순 질문이 아니라 여행 흐름 안의 현실 발화다.\n4. 답변은 사용자가 말한 언어와 같은 언어로 한다.\n5. 번역은 사용자가 명시적으로 요청할 때만 한다.\n6. 사용자의 현재 위치, 선택한 지역, 선택한 장소, 여행 목적, 이전 흐름을 우선 고려한다.\n7. 답변은 짧고 바로 실행 가능한 방향으로 한다.\n8. 필요하면 다음 행동을 제안한다: 길찾기, 전화, 예약, 통역, 주변 맛집, 주변 관광, 숙박, 축제, 병원, 교통.\n9. Travel V1의 목적은 단순 대답이 아니라 현실 실행 흐름 연결이다.\n10. 사용자가 애매하게 말해도 여행 상황을 추론해서 다음 질문 또는 실행 후보를 제시한다.\n\n대화 원칙:\n- 한국어 입력 → 한국어 답변\n- 일본어 입력 → 일본어 답변\n- 영어 입력 → 영어 답변\n- 중국어 입력 → 중국어 답변\n- 태국어 입력 → 태국어 답변\n- 혼합 언어 입력 → 사용자가 가장 많이 쓴 언어로 답변\n- 사용자가 “번역해줘”, “통역해줘”라고 말한 경우에만 번역 모드로 전환\n\nKRXA 판단 흐름:\n현실 발화\n↓\n현재 상황 파악\n↓\n사용자 의도 추정\n↓\n여행 DB/장소/지역/시간/목적 연결\n↓\n짧은 답변\n↓\n다음 실행 후보 제시\n↓\n필요 시 AI대화 계속\n\n금지:\n- 의미 없이 길게 설명하지 않는다.\n- 통역처럼 문장만 바꾸지 않는다.\n- 사용자를 다시 메뉴로 돌려보내지 않는다.\n- 실행 가능한 다음 행동 없이 답변만 끝내지 않는다.\n'

def load_call_prompt() -> str:
    try:
        if PROMPT_PATH.exists():
            data=json.loads(PROMPT_PATH.read_text(encoding='utf-8'))
            return data.get('prompt') or DEFAULT_PROMPT
    except Exception:
        pass
    return DEFAULT_PROMPT

def _extract_reply(result: Any) -> str:
    if isinstance(result, dict):
        return result.get('reply') or result.get('response') or result.get('answer') or result.get('text') or result.get('content') or result.get('translated') or result.get('result') or ''
    if isinstance(result, str):
        return result
    return ''

def _call_existing_engine(text: str, payload: Dict[str, Any], system_prompt: str) -> str:
    try:
        from core.krxa_engine import process
    except Exception:
        return ''
    engine_payload = {
        'text': text,
        'message': text,
        'prompt': text,
        'mode': 'krxa_travel_ai_companion',
        'system_prompt': system_prompt,
        'call_prompt_id': 'KRXA_TRAVEL_AI_COMPANION_V1',
        'source_lang': payload.get('source_lang','auto'),
        'target_lang': payload.get('target_lang', payload.get('source_lang','auto')),
        'same_language_reply': True,
        'translator_role': False,
        'travel_context': payload.get('context', {}),
        'context': payload.get('context', {})
    }
    attempts = [
        lambda: process(engine_payload),
        lambda: process(text, mode='krxa_travel_ai_companion', system_prompt=system_prompt),
        lambda: process(text)
    ]
    for fn in attempts:
        try:
            out=_extract_reply(fn())
            if out:
                return out
        except TypeError:
            continue
        except Exception:
            continue
    return ''

@router.post('/turn')
def travel_v1_ai_dialogue_turn(payload: Dict[str, Any] = Body(...)):
    text = payload.get('text') or payload.get('message') or payload.get('prompt') or ''
    detected_lang = payload.get('detected_lang') or payload.get('source_lang') or 'auto'
    target_lang = payload.get('target_lang') or detected_lang
    system_prompt = load_call_prompt()
    reply = _call_existing_engine(text, payload, system_prompt)
    if not reply:
        reply = 'KRXA Travel AI 호출 확인: ' + str(text)
    return {
        'ok': True,
        'route': '/api/travel-v1/ai-dialogue/turn',
        'mode': 'krxa_travel_ai_companion',
        'call_phrase': 'KRXA_TRAVEL_AI_COMPANION_V1',
        'system_prompt_applied': True,
        'text': reply,
        'reply': reply,
        'source_text': text,
        'detected_lang': detected_lang,
        'source_lang': detected_lang,
        'target_lang': target_lang,
        'same_language_reply': True,
        'translator_role': False,
        'travel_context': True,
        'execution_flow': True,
        'allow_free_dialogue': True,
        'allow_short_utterance': True,
        'created_at': datetime.now().isoformat(timespec='seconds')
    }

@router.get('/status')
def travel_v1_ai_dialogue_status():
    return {
        'ok': True,
        'method': 'POST',
        'route': '/api/travel-v1/ai-dialogue/turn',
        'mode': 'krxa_travel_ai_companion',
        'call_phrase': 'KRXA_TRAVEL_AI_COMPANION_V1',
        'translator_role': False,
        'same_language_reply': True,
        'prompt_path': str(PROMPT_PATH)
    }

@router.get('/prompt')
def travel_v1_ai_dialogue_prompt():
    return {
        'ok': True,
        'call_phrase': 'KRXA_TRAVEL_AI_COMPANION_V1',
        'prompt': load_call_prompt()
    }

# PATCH78_AI_DIALOGUE_SESSION_ROUTES_START
try:
    from datetime import datetime
    import uuid

    @router.post("/api/travel-v1/ai-dialogue/session/start")
    async def travel_ai_dialogue_session_start(payload: dict = None):
        payload = payload or {}
        return {
            "ok": True,
            "session_id": "ai_" + uuid.uuid4().hex[:12],
            "mode": payload.get("mode", "page5_ai_dialogue"),
            "call_phrase": payload.get("call_phrase", "KRXA_TRAVEL_AI_COMPANION_V1"),
            "stt_owner": payload.get("stt_owner", "llm"),
            "tts_owner": payload.get("tts_owner", "krxa"),
            "started_at": datetime.now().isoformat()
        }

    @router.post("/api/travel-v1/ai-dialogue/session/stop")
    async def travel_ai_dialogue_session_stop(payload: dict = None):
        payload = payload or {}
        return {"ok": True, "session_id": payload.get("session_id"), "stopped_at": datetime.now().isoformat()}
except Exception:
    pass
# PATCH78_AI_DIALOGUE_SESSION_ROUTES_END
