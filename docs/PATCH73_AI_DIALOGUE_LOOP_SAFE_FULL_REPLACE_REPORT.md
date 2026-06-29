# PATCH73 AI Dialogue Loop Safe Full Replace V1

- 생성시간: 2026-06-30T00:06:51.024641
- 결정: ai_dialogue_loop.js를 단일 안전 루프로 풀교체한다.

## 해결

```text
1. PATCH59/PATCH65 중복 자동루프 제거
2. 화면 전체 innerHTML 교체 금지
3. 상태/원문/번역 박스만 좁게 갱신
4. AI대화 ON 상태에서 마이크/말하기 버튼만 가로챔
5. 미니말대말과 5페이지 모두 KRXA_AI_DIALOGUE_TRUE_AUTO 인터페이스 사용
```

## 검증 CMD

```bat
node --check ui\js\ai_dialogue_loop.js
findstr /n "PATCH73 SAFE FULL REPLACE" ui\js\ai_dialogue_loop.js
findstr /n "KRXA_AI_DIALOGUE_TRUE_AUTO" ui\js\ai_dialogue_loop.js
findstr /n "document.body.innerHTML" ui\js\ai_dialogue_loop.js
```

## 브라우저 검증

```text
1. AI대화 ON 후 마이크 클릭해도 화면이 흰색으로 바뀌지 않음
2. 5페이지 원문/번역 박스만 갱신
3. 미니말대말 [통역]/[AI대화]/[마이크] 구조 유지
4. 통역 OFF/AI대화 ON 전환 정상
```
