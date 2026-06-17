from pathlib import Path

p = Path("ui/js/m2m_translate.js")
s = p.read_text(encoding="utf-8")

patch = """
// KRXA MIC GLOBAL EXPORT
window.createKRXARecognition = createKRXARecognition;
"""

if "window.createKRXARecognition = createKRXARecognition;" not in s:
    s = s.replace(
        "function createKRXARecognition() {",
        "function createKRXARecognition() {",
        1
    )
    s = s + patch
    p.write_text(s, encoding="utf-8")
    print("GLOBAL EXPORT ADDED")
else:
    print("GLOBAL EXPORT ALREADY EXISTS")