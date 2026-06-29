# PATCH58 AI Dialogue Separate Route V1

- 생성시간: 2026-06-29T14:24:35.673543
- 결정: AI대화는 기존 통역 루트에 섞지 않고 별도 루트로 분리한다.

## 구조

말대말 통역: ui/js/m2m_translate.js -> /api/translate

AI대화: ui/js/ai_dialogue_loop.js -> /api/travel-v1/ai-dialogue/turn

## 변경

```json
[
  "created core/travel_ai_dialogue_router.py",
  "created ui/js/ai_dialogue_loop.js",
  "loaded ai_dialogue_loop.js in ui/app.html",
  "included travel_ai_dialogue_router in main.py",
  "m2m_translate.js checks separate AI dialogue route first"
]
```

## 경고

```json
[]
```

## 검증 CMD

```bat
python -m py_compile core\travel_ai_dialogue_router.py
findstr /n "ai_dialogue_loop" ui\app.html
findstr /n "PATCH58_AI_DIALOGUE_SEPARATE_ROUTE_BRANCH" ui\js\m2m_translate.js
findstr /n "PATCH58_AI_DIALOGUE_SEPARATE_ROUTER" main.py
```
