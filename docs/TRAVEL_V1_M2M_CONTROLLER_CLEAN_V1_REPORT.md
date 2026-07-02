# TRAVEL_V1_M2M_CONTROLLER_CLEAN_V1

## 변경
```json
[
  "flow_signal_router.js replaced with one clean controller",
  "page5_m2m_state_machine.js replaced with state-only machine",
  "m2m_translate.js controller-only translate guard",
  "ai_dialogue_loop.js release/TTS patch appended"
]
```

## 경고
```json
[]
```

## 핵심 알고리즘
```text
사용자 클릭 → source(page5/mini) → ai_on 확인 → ON AI대화 / OFF 통역
```
