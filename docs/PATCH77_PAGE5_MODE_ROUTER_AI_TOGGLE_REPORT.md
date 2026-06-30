# PATCH77 Page5 Mode Router AI Toggle V1

- 생성시간: 2026-06-30T10:49:01.460739
- 결정: **5페이지 AI대화 ON/OFF 토글을 실행 흐름의 주인으로 만든다.**

## 구조

```text
AI대화 ON  → mode=ai        → 통역 루프 중지 → AI 루프만 허용
AI대화 OFF → mode=translate → AI 루프 중지   → 통역 루프만 허용
```

## 변경

```json
[
  "created ui/js/page5_mode_router.js",
  "loaded page5_mode_router.js in app.html",
  "inserted page5 AI mode gate into m2m requestMicAndStart",
  "restricted ai_dialogue_loop to page5 AI mode",
  "added PATCH77 route comment"
]
```

## 경고

```json
[]
```

## 검증 CMD

```bat
findstr /n "page5_mode_router" ui\app.html
findstr /n "PATCH77" ui\js\page5_mode_router.js
findstr /n "PATCH77_M2M_PAGE5_MODE_GATE" ui\js\m2m_translate.js
findstr /n "PATCH77_AI_ONLY_WHEN_PAGE5_MODE_AI" ui\js\ai_dialogue_loop.js
node --check ui\js\page5_mode_router.js
node --check ui\js\m2m_translate.js
node --check ui\js\ai_dialogue_loop.js
python -m py_compile core\travel_ai_dialogue_router.py
```
