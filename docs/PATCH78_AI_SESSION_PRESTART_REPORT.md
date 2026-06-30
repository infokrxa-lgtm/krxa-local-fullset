# PATCH78 AI Session Prestart V1

- 생성시간: 2026-06-30T12:00:29.604352
- 결정: **AI대화 ON 전환 순간 LLM 세션을 선호출/준비한다. 이후 마이크 1회 클릭은 AI 음성 루프로 연결한다.**

## 흐름

```text
AI대화 ON → session/start 선호출 → LLM 세션 준비 → 마이크 1회 클릭 → AI 음성 루프 → KRXA TTS → 다음 말 자동 대기
```

## 변경

```json
[
  "created ui/js/ai_dialogue_session.js",
  "loaded ai_dialogue_session.js in app.html",
  "page5_mode_router starts AI session on AI ON",
  "page5_mode_router stops AI session on AI OFF",
  "ai_dialogue_loop ensures AI session before listen",
  "added AI dialogue session routes"
]
```

## 경고

```json
[]
```

## 검증 CMD

```bat
findstr /n "ai_dialogue_session" ui\app.html
findstr /n "PATCH78" ui\js\ai_dialogue_session.js
findstr /n "PATCH78_AI_SESSION_PRESTART_ON" ui\js\page5_mode_router.js
findstr /n "PATCH78_ENSURE_AI_SESSION_BEFORE_LISTEN" ui\js\ai_dialogue_loop.js
findstr /n "PATCH78_AI_DIALOGUE_SESSION_ROUTES" core\travel_ai_dialogue_router.py
node --check ui\js\ai_dialogue_session.js
node --check ui\js\page5_mode_router.js
node --check ui\js\ai_dialogue_loop.js
python -m py_compile core\travel_ai_dialogue_router.py
```
