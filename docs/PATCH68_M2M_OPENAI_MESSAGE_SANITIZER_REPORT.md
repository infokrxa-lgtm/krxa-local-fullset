# PATCH68 M2M OpenAI Message Sanitizer V1

- 생성시간: 2026-06-29T22:08:41.992073
- 목적: KRXA ChatGPT 연결 오류 해결

## 오류

```text
Invalid type for messages[n].content: expected string or array, got object
```

## 해결

```text
core/krxa_engine.py -> sanitize_openai_messages(messages) -> OpenAI 호출 직전 정규화
```

## 변경

```json
[
  "inserted sanitize_openai_messages into core/krxa_engine.py",
  "created test_patch68_sanitizer.py"
]
```

## 경고

```json
[
  "OpenAI create call detected but nearby sanitizer not confirmed; manual inspection may be needed"
]
```

## 검증 CMD

```bat
python -m py_compile core\krxa_engine.py
python test_patch68_sanitizer.py
findstr /n "PATCH68_OPENAI_MESSAGE_SANITIZER" core\krxa_engine.py
findstr /n "sanitize_openai_messages" core\krxa_engine.py
```
