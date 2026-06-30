# PATCH76 Mini Quick Translate + Page5 AI LLM-STT V1

- 생성시간: 2026-06-30T10:05:19.162785
- 결정: **미니=빠른 통역. 5페이지=전문 통역/AI대화. AI대화=LLM STT/이해 + KRXA TTS.**

## 최종 구조

```text
미니 말대말 = 기존 하단 UI 유지 + 빠른 통역만
5페이지 = 통역 / AI대화
AI대화 = LLM STT/이해 + KRXA TTS
```

## 변경

```json
[
  "mini_m2m_simple_panel.js: existing bottom mini UI only, quick translate only",
  "app.html mini_talk onclick normalized count=2",
  "m2m_translate requestMicAndStart hard forceTranslate bypass",
  "ai_dialogue_loop page5 AI session marker",
  "ai_dialogue_loop clears mini force on page5 AI mic",
  "travel_ai_dialogue_router AI mode comment"
]
```

## 경고

```json
[]
```

## 검증 CMD

```bat
findstr /n "PATCH76" ui\js\mini_m2m_simple_panel.js
findstr /n "PATCH76_FORCE_TRANSLATE_HARD_BYPASS" ui\js\m2m_translate.js
findstr /n "PATCH76_CLEAR_MINI_FORCE_ON_PAGE5_AI_MIC" ui\js\ai_dialogue_loop.js
findstr /n "KRXA_App.goUserPage(5)" ui\app.html
node --check ui\js\mini_m2m_simple_panel.js
node --check ui\js\m2m_translate.js
node --check ui\js\ai_dialogue_loop.js
python -m py_compile core\travel_ai_dialogue_router.py
```
