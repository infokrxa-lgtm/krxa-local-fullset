# PATCH74 Mini M2M Route + Mic Gate V1

- 생성시간: 2026-06-30T01:35:51.352872
- 결정: 미니말대말 클릭은 5페이지 이동이 아니라 미니패널 open. AI대화 ON이면 기존 통역 마이크 실행을 차단하고 AI대화 루프만 실행.

## 수정 1: 미니말대말 이동 차단

```text
app.html data-admin-id="mini_talk"
KRXA_App.goUserPage(5)
↓
KRXA_MINI_M2M_SIMPLE_PANEL.init()
```

## 수정 2: 마이크 실행 분리

```text
AI대화 ON  → KRXA_AI_DIALOGUE_TRUE_AUTO.start()
AI대화 OFF → 기존 KRXA_Translate.requestMicAndStart 흐름
```

## 변경

```json
[
  "replaced mini_talk goUserPage(5) onclick count=2",
  "added open alias to KRXA_MINI_M2M_SIMPLE_PANEL",
  "inserted AI gate into requestMicAndStart",
  "reinforced quick modal mic button click handler"
]
```

## 경고

```json
[]
```

## 검증 CMD

```bat
findstr /n "mini_talk" ui\app.html
findstr /n "KRXA_App.goUserPage(5)" ui\app.html
findstr /n "PATCH74_M2M_MIC_AI_GATE" ui\js\m2m_translate.js
findstr /n "PATCH74_OPEN_ALIAS" ui\js\mini_m2m_simple_panel.js
node --check ui\js\m2m_translate.js
node --check ui\js\mini_m2m_simple_panel.js
```
