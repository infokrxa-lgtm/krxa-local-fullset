
from core.krxa_engine import sanitize_openai_messages, safe_build_messages
print('[OK] imports sanitize_openai_messages and safe_build_messages')
sample = [{'role':'user','content':{'x':1}}]
out = sanitize_openai_messages(sample)
assert isinstance(out[0]['content'], str)
print('[OK] sanitizer still works')
