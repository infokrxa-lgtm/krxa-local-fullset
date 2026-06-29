# PATCH59 AI Dialogue Auto Voice Loop V1

- 생성시간: 2026-06-29T14:45:42.495489
- 결정: AI대화 ON일 때 별도 자동 음성인식 자유대화 루프를 시작한다.

## 구조

AI대화 ON -> 자동 듣기 -> 별도 AI대화 API -> TTS -> 다시 듣기

## 변경

```json
[
  "added auto voice loop to ai_dialogue_loop.js"
]
```

## 경고

```json
[]
```

## 검증 CMD

```bat
findstr /n "PATCH59_AI_DIALOGUE_AUTO_VOICE_LOOP" ui\js\ai_dialogue_loop.js
```
