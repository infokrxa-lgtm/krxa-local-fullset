from pathlib import Path

# 1. main.py API 추가
p = Path("main.py")
text = p.read_text(encoding="utf-8")

api_code = r'''
# ===== KRXAI Memory Loop Report API =====
from datetime import datetime
import json

@app.post("/api/krxai-memory/report")
def krxai_memory_report():
    path = Path("storage/krxai_memory_loop.json")
    path.parent.mkdir(parents=True, exist_ok=True)

    if path.exists():
        try:
            data = json.loads(path.read_text(encoding="utf-8"))
        except Exception:
            data = {}
    else:
        data = {}

    reports = data.get("reports", [])

    report = {
        "time": datetime.now().isoformat(timespec="seconds"),
        "project": "Travel V1",
        "type": "control_report",
        "recent_errors": [
            "통역 지연",
            "STT 전 점검 필요",
            "없는 문장 차단",
            "UI 개선 필요"
        ],
        "improve_candidates": [
            "STT 전 점검 엔진",
            "Truth First Mode 강화",
            "식당 사진분석 Truth First Vision",
            "통화/메신저 KRXA 중계 구조",
            "7페이지 UI 개선"
        ],
        "next_action": "STT 전 점검 엔진부터 적용"
    }

    reports.insert(0, report)

    data["name"] = "KRXAI Memory Loop Connector v01"
    data["status"] = "report_generated"
    data["project"] = "Travel V1"
    data["current_focus"] = "STT 전 점검, Truth First Mode, Travel UI 개선, 관제 보고 연결"
    data["reports"] = reports[:20]
    data["last_report"] = report
    data["next_action"] = report["next_action"]

    path.write_text(json.dumps(data, ensure_ascii=False, indent=2), encoding="utf-8")

    return {
        "ok": True,
        "message": "KRXAI 관제 보고 생성 완료",
        "report": report
    }


@app.get("/api/krxai-memory")
def krxai_memory_get():
    path = Path("storage/krxai_memory_loop.json")
    if not path.exists():
        return {"ok": False, "message": "memory loop file not found"}
    try:
        return json.loads(path.read_text(encoding="utf-8"))
    except Exception as e:
        return {"ok": False, "error": str(e)}
# ===== End KRXAI Memory Loop Report API =====
'''

if "KRXAI Memory Loop Report API" not in text:
    text += "\n" + api_code + "\n"

p.write_text(text, encoding="utf-8")


# 2. control.html 버튼 기능 교체
p = Path("ui/control.html")
text = p.read_text(encoding="utf-8")

old = """<button onclick="alert('관제 보고 생성 준비 단계입니다.')">관제 보고 생성</button>"""

new = """<button onclick="createKrxaiReport()">관제 보고 생성</button>
  <pre id="krxaiReportBox" style="margin-top:12px;background:#020617;color:#dbeafe;padding:12px;border-radius:8px;white-space:pre-wrap;">아직 보고가 생성되지 않았습니다.</pre>

  <script>
    async function createKrxaiReport(){
      const box = document.getElementById("krxaiReportBox");
      if(box) box.innerText = "관제 보고 생성 중...";

      try{
        const res = await fetch("/api/krxai-memory/report", {method:"POST"});
        const data = await res.json();

        if(box){
          box.innerText =
            "생성 완료\\n\\n" +
            "프로젝트: " + data.report.project + "\\n" +
            "시간: " + data.report.time + "\\n" +
            "다음 행동: " + data.report.next_action + "\\n\\n" +
            "개선 후보:\\n- " + data.report.improve_candidates.join("\\n- ");
        }
      }catch(e){
        if(box) box.innerText = "관제 보고 생성 실패: " + e.message;
      }
    }
  </script>"""

if old in text:
    text = text.replace(old, new)

p.write_text(text, encoding="utf-8")

print("KRXAI memory report patch complete")