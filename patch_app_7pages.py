from pathlib import Path

p = Path("ui/app.html")
text = p.read_text(encoding="utf-8")

text = text.replace("width:600%", "width:700%")
text = text.replace("let currentPage=0,totalPages=6", "let currentPage=0,totalPages=7")

text = text.replace("KRXA_App.goPage(5)\"><b>🆘</b>SOS", "KRXA_App.goPage(6)\"><b>🆘</b>SOS")
text = text.replace("KRXA_App.goPage(5)\"><b>🔒</b>OFF", "KRXA_App.goPage(6)\"><b>🔒</b>OFF")

text = text.replace('<div class="title" id="detailTitle">상세 안내</div>', '<div class="title" id="detailTitle">식당</div>')

text = text.replace("function openDetail(cat){", "function openDetail(cat, noMove){")
text = text.replace("        goPage(2);", "        if(!noMove) goPage(2);")

marker = '''    <section class="page">
      <div class="screen">
        <div class="sosTop">'''

usage_page = '''    <section class="page">
      <div class="screen">
        <div class="header"><button class="back" onclick="KRXA_App.goPage(1)">‹</button><div class="title">사용내역</div></div>
        <div class="content">
          <div class="msg"><b>최근 통역</b><span>아직 저장된 통역 내역이 없습니다.</span></div>
          <div class="msg"><b>최근 여행 이용</b><span>식당 / 공항 / 호텔 / 길찾기 이용 기록이 여기에 표시됩니다.</span></div>
          <div class="msg"><b>KRXA 기억 루프</b><span>사용자가 종료하지 않은 흐름은 다음 접속 시 이어갈 수 있게 복원합니다.</span></div>
          <button class="btn blue" style="width:100%;margin-top:8px" onclick="KRXA_App.goPage(3)">통역 계속하기</button>
          <button class="btn green" style="width:100%;margin-top:8px" onclick="KRXA_App.goPage(1)">여행 메뉴로 이동</button>
          <button class="btn red" style="width:100%;margin-top:8px" onclick="localStorage.clear();alert('사용내역 초기화 완료')">사용내역 초기화</button>
        </div>
      </div>
    </section>

'''

if marker in text and "KRXA 기억 루프" not in text:
    text = text.replace(marker, usage_page + marker)

text = text.replace("buildHub();\n  render();", "buildHub();\n  openDetail('food', true);\n  render();")

p.write_text(text, encoding="utf-8")
print("app.html patched to 7 pages")