# PATCH69 M2M Sanitizer Bind + Mini Direct Service V1

- 생성시간: 2026-06-29T22:24:04.246745
- 결정: OpenAI messages sanitizer를 실제 호출부에 연결하고, 미니말대말은 페이지 이동이 아니라 현재 화면에서 기능 수행하게 한다.

## 해결 1

```text
messages=build_messages(...)
↓
messages=safe_build_messages(...)
```

## 해결 2

```text
미니말대말 클릭
↓
5페이지 이동 차단
↓
현재 화면에서 통역/AI대화 기능 수행
```

## 변경

```json
[
  "inserted safe_build_messages before process",
  "bound messages=build_messages to safe_build_messages",
  "created ui/js/mini_m2m_direct_service.js",
  "loaded mini_m2m_direct_service.js in app.html",
  "exposed toggleAuto/recordVoice to window if available",
  "created test_patch69_m2m_sanitizer_bind.py"
]
```

## 경고

```json
[]
```

## 검증 CMD

```bat
python -m py_compile core\krxa_engine.py
python test_patch69_m2m_sanitizer_bind.py
findstr /n "safe_build_messages" core\krxa_engine.py
findstr /n "messages=safe_build_messages" core\krxa_engine.py
findstr /n "mini_m2m_direct_service" ui\app.html
findstr /n "PATCH69_EXPOSE_M2M_FUNCTIONS" ui\js\m2m_translate.js
```
