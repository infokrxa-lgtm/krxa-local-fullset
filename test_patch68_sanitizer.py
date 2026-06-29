
from core.krxa_engine import sanitize_openai_messages

sample = [
    {"role":"system","content":"ok"},
    {"role":"user","content":{"a":1,"b":"테스트"}},
    {"role":"assistant","content":None},
    {"role":"user","content":["bad", {"type":"text","text":"ok"}]},
]
out = sanitize_openai_messages(sample)
print(out)
assert isinstance(out[1]["content"], str)
assert isinstance(out[2]["content"], str)
assert isinstance(out[3]["content"], str)
print("[OK] PATCH68 sanitizer test passed")
