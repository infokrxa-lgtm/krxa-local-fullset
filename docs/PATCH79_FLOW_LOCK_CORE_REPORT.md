# PATCH79 Flow Lock Core V1

- 생성시간: 2026-06-30T13:24:09.169625
- 결정: **각 기능이 자기 영역만 수정하게 하는 공통 Flow Lock을 도입한다.**

## 핵심 설계

```text
currentFlow = translate | ai_dialogue | food | hotel | map | travel_search | status

translate     → 원문/번역 박스만
ai_dialogue   → AI/대화 응답 영역만
food/hotel/map→ 검색결과/지도 영역만
status        → 전용 상태줄만
```

## 금지

```text
AI 상태문구가 AI대화 토글 라벨 변경 금지
통역 결과가 검색 카드 침범 금지
검색 결과가 말대말 박스 침범 금지
document.body / 큰 container innerHTML 변경 금지
```

## 변경

```json
[
  "created ui/js/flow_lock_core.js",
  "loaded flow_lock_core.js in app.html",
  "added translate flow marker to m2m_translate.js",
  "added ai flow marker to ai_dialogue_loop.js",
  "page5_mode_router now sets flow lock mode",
  "added travel_search flow marker to ui/js/travel_v2_flow.js",
  "added map flow marker to ui/js/travel_map_priority.js"
]
```

## 경고

```json
[]
```

## 검증 CMD

```bat
findstr /n "flow_lock_core" ui\app.html
findstr /n "PATCH79" ui\js\flow_lock_core.js
findstr /n "PATCH79_TRANSLATE_FLOW_MARKER" ui\js\m2m_translate.js
findstr /n "PATCH79_AI_FLOW_MARKER" ui\js\ai_dialogue_loop.js
findstr /n "PATCH79_PAGE5_FLOW_LOCK_MODE_SET" ui\js\page5_mode_router.js
node --check ui\js\flow_lock_core.js
node --check ui\js\m2m_translate.js
node --check ui\js\ai_dialogue_loop.js
node --check ui\js\page5_mode_router.js
```
