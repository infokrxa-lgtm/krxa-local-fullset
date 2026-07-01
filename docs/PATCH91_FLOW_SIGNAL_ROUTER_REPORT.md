# PATCH91 Flow Signal Router V1

- 생성시간: 2026-07-01T12:44:55.371129
- 결정: **클릭바는 실행하지 않고 Flow ID만 전달하며, KRXA_FLOW.go를 단일 진입점으로 둔다.**

## 1차 적용 범위

```text
modal.close
page.back
m2m.speak
m2m.stop
```

## 원칙

```text
클릭바 = data-flow 전달
실행 = KRXA_FLOW.go(flow_id)
Controller = flow_id별 실행 담당
```

## 변경

```json
[
  "created ui/js/flow_signal_router.js",
  "loaded flow_signal_router.js in app.html",
  "tagged app.html onclick with data-flow for onclick=\"KRXA_App.closeModal()\"",
  "tagged app.html onclick with data-flow for onclick=\"KRXA_Translate.requestMicAndStart()\"",
  "tagged app.html onclick with data-flow for onclick=\"KRXA_App.goUserPage(2)\"",
  "added PATCH91 compatibility note to m2m_translate.js",
  "added PATCH91 page5 flow signal note"
]
```

## 경고

```json
[]
```

## 검증 CMD

```bat
findstr /n "flow_signal_router" ui\app.html
findstr /n "PATCH91" ui\js\flow_signal_router.js
findstr /n "data-flow" ui\app.html
findstr /n "PATCH91" ui\js\m2m_translate.js
findstr /n "PATCH91" ui\js\page5_m2m_state_machine.js
node --check ui\js\flow_signal_router.js
node --check ui\js\m2m_translate.js
node --check ui\js\page5_m2m_state_machine.js
```
