from pathlib import Path
import re

p = Path("ui/app.html")
text = p.read_text(encoding="utf-8")

# 통역 카드 후보 전체 찾기
pattern = r'<div class="hubCard"[^>]*>.*?<strong>통역</strong>.*?<span>자동대화</span>.*?</div>'

new = '''<div class="hubCard" onclick="KRXA_Translate.setListenMode('tv');KRXA_App.goPage(3)"><b>📺</b><strong>TV시청</strong><span>실시간 자막통역</span></div>'''

text2, count = re.subn(pattern, new, text, count=1, flags=re.S)

if count == 0:
    print("교체 실패: 통역/자동대화 카드 못 찾음")
else:
    p.write_text(text2, encoding="utf-8")
    print("교체 완료:", count)