from pathlib import Path

# 1. control.html 수정
p = Path("ui/control.html")
text = p.read_text(encoding="utf-8")

# 기존 링크 새창 처리
text = text.replace('href="/user"', 'href="/user" target="_blank"')
text = text.replace('href="/app"', 'href="/app" target="_blank"')
text = text.replace('href="/test_voice"', 'href="/test_voice" target="_blank"')
text = text.replace('href="/dev"', 'href="/dev" target="_blank"')
text = text.replace('href="/api/state"', 'href="/api/state" target="_blank"')
text = text.replace('href="/api/travel-links"', 'href="/api/travel-links" target="_blank"')

# KRXAI 학습기억 루프 섹션 추가
marker = "</body>"
section = """
<section class="card">
  <h2>9. KRXAI 학습기억 루프</h2>
  <p>ChatGPT ⇄ KRXAI 분석, 수정·신규·개선 후보를 관제 보고로 연결합니다.</p>

  <div class="grid">
    <div class="mini">
      <b>최근 오류</b>
      <p>통역 지연 / STT 전 점검 / 없는 문장 차단 / UI 개선</p>
    </div>
    <div class="mini">
      <b>개선 후보</b>
      <p>Memory Loop Connector v01 생성</p>
    </div>
    <div class="mini">
      <b>다음 행동 1개</b>
      <p>storage/krxai_memory_loop.json 생성 후 관제 연결</p>
    </div>
  </div>

  <button onclick="window.open('/dev','_blank')">DEV 새창 열기</button>
  <button onclick="window.open('/api/state','_blank')">STATE JSON 새창</button>
  <button onclick="alert('관제 보고 생성 준비 단계입니다.')">관제 보고 생성</button>
</section>
"""

if "KRXAI 학습기억 루프" not in text:
    text = text.replace(marker, section + "\n" + marker)

p.write_text(text, encoding="utf-8")


# 2. dev.html 링크 새창 처리
p = Path("ui/dev.html")
text = p.read_text(encoding="utf-8")

text = text.replace('href="/user"', 'href="/user" target="_blank"')
text = text.replace('href="/app"', 'href="/app" target="_blank"')
text = text.replace('href="/test_voice"', 'href="/test_voice" target="_blank"')
text = text.replace('href="/control"', 'href="/control" target="_blank"')
text = text.replace('href="/api/state"', 'href="/api/state" target="_blank"')

p.write_text(text, encoding="utf-8")


# 3. memory loop 저장 파일 생성
storage = Path("storage/krxai_memory_loop.json")
if not storage.exists():
    storage.write_text("""{
  "name": "KRXAI Memory Loop Connector v01",
  "status": "created",
  "project": "Travel V1",
  "current_focus": "STT 전 점검, Truth First Mode, Travel UI 개선, 관제 보고 연결",
  "recent_issues": [],
  "improve_candidates": [],
  "next_action": "control/dev 새창 작업 구조 확인"
}
""", encoding="utf-8")

print("control/dev memory loop patch complete")