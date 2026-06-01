from pathlib import Path

p = Path("main.py")
text = p.read_text(encoding="utf-8")

# 기존 잘못 들어간 패치 제거
start = text.find("# ===== KRXA Travel V1 UI Static Route =====")
end = text.find("# ===== End KRXA Travel V1 UI Static Route =====")
if start != -1 and end != -1:
    end = end + len("# ===== End KRXA Travel V1 UI Static Route =====")
    text = text[:start] + text[end:]

# import 보강
if "from fastapi.staticfiles import StaticFiles" not in text:
    text = text.replace(
        "from fastapi import FastAPI, Form, UploadFile, File, Request",
        "from fastapi import FastAPI, Form, UploadFile, File, Request\nfrom fastapi.staticfiles import StaticFiles"
    )

if "FileResponse" not in text:
    text = text.replace(
        "from fastapi.responses import HTMLResponse, RedirectResponse",
        "from fastapi.responses import HTMLResponse, RedirectResponse, FileResponse"
    )

# app 생성 직후 /ui mount 추가
needle = 'app = FastAPI(title="KRXA LOCAL FULLSET REAL")'
insert = '''
app.mount("/ui", StaticFiles(directory="ui", html=True), name="ui")

@app.get("/travel-v1", response_class=HTMLResponse)
def travel_v1():
    return render_template("app.html")
'''

if "app.mount(\"/ui\"" not in text:
    text = text.replace(needle, needle + "\n" + insert)

p.write_text(text, encoding="utf-8")
print("main.py fixed")