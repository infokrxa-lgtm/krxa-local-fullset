from pathlib import Path

p = Path("main.py")
text = p.read_text(encoding="utf-8")

api = r'''
# ===== KRXAI Auto Memory Event API =====
@app.post("/api/krxai-memory/event")
async def krxai_memory_event(request: Request):
    import json
    from datetime import datetime

    path = Path("storage/krxai_memory_loop.json")
    path.parent.mkdir(parents=True, exist_ok=True)

    try:
        body = await request.json()
    except Exception:
        body = {}

    if path.exists():
        try:
            data = json.loads(path.read_text(encoding="utf-8"))
        except Exception:
            data = {}
    else:
        data = {
            "name": "KRXAI Auto Memory Loop v01",
            "mode": "auto_execution_loop",
            "project": "Travel V1",
            "events": []
        }

    events = data.get("events", [])

    event = {
        "time": datetime.now().isoformat(timespec="seconds"),
        "project": "Travel V1",
        "type": body.get("type", "unknown"),
        "source": body.get("source", "m2m_translate"),
        "status": body.get("status", ""),
        "input": body.get("input", ""),
        "output": body.get("output", ""),
        "message": body.get("message", "")
    }

    events.insert(0, event)
    data["events"] = events[:100]

    # 간단 자동분석
    fails = [e for e in events if "fail" in str(e.get("type","")) or "error" in str(e.get("type",""))]
    data["auto_analysis"] = {
        "total_events": len(events),
        "fail_events": len(fails),
        "next_candidate": "STT 전 Conversation Gate 개선" if len(fails) >= 3 else "통역 사용 데이터 계속 수집"
    }
    data["next_action"] = data["auto_analysis"]["next_candidate"]

    path.write_text(json.dumps(data, ensure_ascii=False, indent=2), encoding="utf-8")

    return {"ok": True, "event": event, "next_action": data["next_action"]}
# ===== End KRXAI Auto Memory Event API =====
'''

if "KRXAI Auto Memory Event API" not in text:
    text += "\n" + api + "\n"

p.write_text(text, encoding="utf-8")


p = Path("ui/js/m2m_translate.js")
text = p.read_text(encoding="utf-8")

helper = r'''
  async function saveMemoryEvent(type, status, input, output, message) {
    try {
      await fetch("/api/krxai-memory/event", {
        method: "POST",
        headers: {"Content-Type": "application/json"},
        body: JSON.stringify({
          type: type,
          source: "m2m_translate",
          status: status || "",
          input: input || "",
          output: output || "",
          message: message || ""
        })
      });
    } catch (e) {
      // 자동기억 저장 실패는 사용자 흐름을 막지 않는다.
    }
  }

'''

if "function saveMemoryEvent" not in text:
    text = text.replace("  async function translateText(text, source) {", helper + "  async function translateText(text, source) {")

# 번역 성공 저장
text = text.replace(
    '      if (resultEl) resultEl.innerText = result || "-";\n      lastAudioText = result;',
    '      if (resultEl) resultEl.innerText = result || "-";\n      lastAudioText = result;\n      saveMemoryEvent("translate_success", "ok", cleanText, result, "번역 성공");'
)

# 번역 오류 저장
text = text.replace(
    '      setStatus("통역 연결 오류");',
    '      saveMemoryEvent("translate_error", "error", cleanText, "", e.message);\n      setStatus("통역 연결 오류");'
)

# STT 성공 저장
text = text.replace(
    'lastSttText = currentText;\nawait translateText(currentText, "voice");',
    'lastSttText = currentText;\nsaveMemoryEvent("stt_success", "ok", currentText, "", "STT 성공");\nawait translateText(currentText, "voice");'
)

# STT 실패 저장
text = text.replace(
    'setStatus("음성 인식 실패");',
    'saveMemoryEvent("stt_fail", "fail", "", "", "음성 인식 실패");\n            setStatus("음성 인식 실패");'
)

# STT 연결 오류 저장
text = text.replace(
    'setStatus("STT 연결 오류");',
    'saveMemoryEvent("stt_error", "error", "", "", e.message);\n          setStatus("STT 연결 오류");'
)

# 사용자 종료 저장
text = text.replace(
    'setStatus("대기 중");\n    setFlowState("", "자동대화 종료");',
    'saveMemoryEvent("user_stop", "ok", "", "", "사용자 종료");\n    setStatus("대기 중");\n    setFlowState("", "자동대화 종료");'
)

p.write_text(text, encoding="utf-8")

print("m2m auto memory patch complete")