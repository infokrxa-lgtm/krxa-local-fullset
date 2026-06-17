from pathlib import Path
import re

p = Path("ui/app.html")
text = p.read_text(encoding="utf-8")

old_pattern = r'<div class="hubCard" onclick="KRXA_App\.goPage\(3\)"><b>🎙</b><strong>통역</strong><span>자동대화</span></div>'

new = '''<div class="hubCard" onclick="KRXA_Translate.setListenMode('tv');KRXA_App.goPage(3)"><b>📺</b><strong>TV시청</strong><span>실시간 자막통역</span></div>'''

text2 = re.sub(old_pattern, new, text)

if text2 == text:
    print("교체 실패: 기존 통역 카드 패턴을 못 찾았습니다.")
else:
    p.write_text(text2, encoding="utf-8")
    print("교체 완료: 통역 카드 → TV시청")