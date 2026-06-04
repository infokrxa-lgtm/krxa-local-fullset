from pathlib import Path

p = Path("ui/app.html")
text = p.read_text(encoding="utf-8")

old1 = 't.onclick=()=>goPage(3);'
new1 = 't.onclick=()=>{KRXA_Translate.setListenMode("tv");goPage(3);};'

old2 = 't.innerHTML="<span>🎙️</span>통역<small>자동대화</small>";'
new2 = 't.innerHTML="<span>📺</span>TV시청<small>실시간 자막통역</small>";'

changed = 0

if old1 in text:
    text = text.replace(old1, new1, 1)
    changed += 1

if old2 in text:
    text = text.replace(old2, new2, 1)
    changed += 1

p.write_text(text, encoding="utf-8")

print("changed =", changed)