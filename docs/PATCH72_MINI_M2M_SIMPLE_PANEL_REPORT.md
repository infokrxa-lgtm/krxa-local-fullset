# PATCH72 Mini M2M Simple Panel V1

- 생성시간: 2026-06-29T23:19:20.162407
- 결정: 미니말대말은 5페이지 이동이 아니라 단순 패널에서 통역/AI대화 선택 후 마이크로 기능 수행한다.

## 미니말대말 UI

```text
[통역] [AI대화]
      [마이크]
```

## 해결

```text
1. 미니말대말 클릭 시 5페이지 이동 제거
2. 말하기/마이크 클릭 복구
3. 통역/AI대화 모드 선택 가능
4. 전체 클릭 capture 사용 안 함
```

## 변경

```json
[
  "disabled old mini_m2m_direct_service.js safely",
  "created ui/js/mini_m2m_simple_panel.js",
  "disabled mini_m2m_direct_service.js script tag in app.html",
  "loaded mini_m2m_simple_panel.js in app.html",
  "reinforced exposing recordVoice/toggleAuto/stopAuto"
]
```

## 경고

```json
[]
```

## 검증 CMD

```bat
findstr /n "mini_m2m_simple_panel" ui\app.html
findstr /n "KRXA_MINI_M2M_SIMPLE_PANEL" ui\js\mini_m2m_simple_panel.js
findstr /n "PATCH72_FORCE_EXPOSE_M2M_FUNCTIONS" ui\js\m2m_translate.js
findstr /n "mini_m2m_direct_service" ui\app.html
```

## 브라우저 검증

```text
1. 사용자 UI 클릭바 정상
2. 미니말대말 클릭해도 5페이지 이동 안 함
3. 미니 패널에 [통역] [AI대화] [마이크] 표시
4. 통역 모드 + 마이크 클릭 가능
5. AI대화 모드 + 마이크 클릭 가능
```
