# PATCH75 Mini Translate Only + Page5 Split V1

- 생성시간: 2026-06-30T08:46:32.994686
- 결정: **미니 말대말은 통역 전용. 5페이지에서만 통역/AI대화 전환. STT/TTS 유지.**

## 최종 구조

```text
미니 말대말 = 통역 전용
5페이지 말대말 = 통역 / AI대화 전환
m2m_translate.js = 통역 전담
ai_dialogue_loop.js = AI대화 전담(5페이지 기준)
```

## 변경

```json
[
  "normalized mini_talk onclick to translate-only panel count=4",
  "replaced mini_m2m_simple_panel.js as translate-only",
  "changed requestMicAndStart signature to accept opt",
  "inserted forceTranslate bypass into requestMicAndStart AI gate",
  "added mini-translate guard to ai_dialogue_loop"
]
```

## 경고

```json
[]
```

## 검증 CMD

```bat
findstr /n "PATCH75" ui\js\mini_m2m_simple_panel.js
findstr /n "PATCH75_FORCE_TRANSLATE_BYPASS" ui\js\m2m_translate.js
findstr /n "PATCH75_AI_PAGE5_ONLY_GUARD" ui\js\ai_dialogue_loop.js
findstr /n "KRXA_App.goUserPage(5)" ui\app.html
node --check ui\js\mini_m2m_simple_panel.js
node --check ui\js\m2m_translate.js
node --check ui\js\ai_dialogue_loop.js
```
