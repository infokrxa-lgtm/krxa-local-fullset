# PATCH90 RecordVoice Single Entry V1

- 생성시간: 2026-07-01T10:14:19.100427
- 결정: **recordVoice를 단일 마이크 진입점으로 만들고 Travel V1 권한/overlay 제어를 제거한다.**

## 원칙

```text
navigator.mediaDevices.getUserMedia()만 마이크 권한을 요청한다.
Travel V1은 권한 요청 UI를 직접 만들거나 페이지를 전환하지 않는다.
recordVoice()가 단일 진입점이다.
허용 후 현재 페이지를 유지한다.
```

## 변경

```json
[
  "recordVoice now owns getUserMedia directly",
  "requestMicAndStart delegates directly to recordVoice",
  "blocked mic-related KRXA_App.openModal calls",
  "added no-permission-control note to ui/js/page5_m2m_state_machine.js"
]
```

## 경고

```json
[
  "ui/js/permission_manager.js not found",
  "ui/js/mic_permission_flow.js not found",
  "ui/js/mic_permission_only_core.js not found",
  "ui/js/mini_m2m_scoped_modal.js not found"
]
```

## 검증 CMD

```bat
findstr /n "PATCH90" ui\js\m2m_translate.js
findstr /n "PATCH90" ui\js\permission_manager.js
findstr /n "PATCH90" ui\js\mic_permission_flow.js
findstr /n "PATCH90" ui\js\mic_permission_only_core.js
findstr /n "PATCH90" ui\js\page5_m2m_state_machine.js
findstr /n "PATCH90" ui\js\mini_m2m_scoped_modal.js
node --check ui\js\m2m_translate.js
node --check ui\js\permission_manager.js
node --check ui\js\mic_permission_flow.js
node --check ui\js\mic_permission_only_core.js
node --check ui\js\page5_m2m_state_machine.js
node --check ui\js\mini_m2m_scoped_modal.js
```
