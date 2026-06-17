from pathlib import Path

p = Path("main.py")
text = p.read_text(encoding="utf-8")

text = text.replace(
    "from fastapi.responses import HTMLResponse, RedirectResponse",
    "from fastapi.responses import HTMLResponse, RedirectResponse, FileResponse"
)

if "from fastapi.staticfiles import StaticFiles" not in text:
    text = text.replace(
        "from fastapi import FastAPI, Form, UploadFile, File, Request",
        "from fastapi import FastAPI, Form, UploadFile, File, Request\nfrom fastapi.staticfiles import StaticFiles"
    )

patch = '''
# ===== KRXA Travel V1 UI Static Route =====
try:
    app.mount("/ui", StaticFiles(directory="ui", html=True), name="ui")
except Exception:
    pass

@app.get("/travel-v1", response_class=HTMLResponse)
def travel_v1():
    return Path("ui/app.html").read_text(encoding="utf-8")
# ===== End KRXA Travel V1 UI Static Route =====
'''

if "KRXA Travel V1 UI Static Route" not in text:
    text += "\\n" + patch + "\\n"

p.write_text(text, encoding="utf-8")
print("main.py patched")