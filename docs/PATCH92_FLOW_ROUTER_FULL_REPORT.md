# PATCH92 Flow Router Full V1

- 생성시간: 2026-07-01T13:19:45.695418
- 결정: **flow_signal_router.js는 풀버전 교체하고, m2m_translate/app.html은 최소 패치만 적용한다.**

## 핵심 변경

```text
1. flow_signal_router.js 풀버전 교체
2. 자동 태깅 제거
3. data-flow가 명시된 클릭바만 처리
4. app.html은 명시 data-flow만 패치
5. m2m_translate.js는 호환 주석만 추가
```

## 변경

```json
[
  "FULL replaced ui/js/flow_signal_router.js with PATCH92 explicit data-flow router",
  "added PATCH92 compatibility note to m2m_translate.js"
]
```

## 경고

```json
[]
```

## 검증 CMD

```bat
findstr /n "PATCH92" ui\js\flow_signal_router.js
findstr /n "autoTag" ui\js\flow_signal_router.js
findstr /n "data-flow" ui\app.html
findstr /n "PATCH92" ui\js\m2m_translate.js
node --check ui\js\flow_signal_router.js
node --check ui\js\m2m_translate.js
```
