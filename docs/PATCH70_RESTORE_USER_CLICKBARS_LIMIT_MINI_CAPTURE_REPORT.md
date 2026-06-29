# PATCH70 Restore User Clickbars + Limit Mini Capture V1

- 생성시간: 2026-06-29T22:35:51.446036
- 결정: PATCH69의 미니말대말 클릭 차단 범위를 줄여 사용자 UI 1~8페이지 클릭바를 복구한다.

## 원인

```text
미니말대말 직접실행을 위해 click capture를 넣었는데,
차단 범위가 넓어서 사용자 UI 클릭바/카드까지 막았을 가능성.
```

## 수정

```text
페이지 이동/카드/탭/네비게이션 클릭은 통과
미니말대말 내부의 명확한 말하기/마이크/AI대화 버튼만 차단
```

## 변경

```json
[
  "replaced mini_m2m_direct_service.js with limited capture version",
  "created patch70_clickbar_recovery_marker.js",
  "loaded patch70_clickbar_recovery_marker.js in app.html"
]
```

## 경고

```json
[]
```

## 검증 CMD

```bat
findstr /n "PATCH70_LIMITED_CAPTURE" ui\js\mini_m2m_direct_service.js
findstr /n "patch70_clickbar_recovery_marker" ui\app.html
findstr /n "PATCH70_USER_CLICKBAR_RECOVERY_MARKER" ui\js\patch70_clickbar_recovery_marker.js
```

## 브라우저 검증

```text
1~8페이지 클릭바 정상 이동
식당/호텔/공항/관광 카드 정상 클릭
미니말대말 AI대화 체크박스 정상 ON/OFF
미니말대말 말하기는 현재 화면에서 기능 수행
```
