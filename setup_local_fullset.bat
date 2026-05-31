@echo off
cd /d C:\Users\aaa\KRXA_LOCAL_FULLSET

echo [KRXA] missing files setup start...

if not exist storage mkdir storage
if not exist storage\history mkdir storage\history

if not exist .env (
  echo OPENAI_API_KEY=여기에_API_KEY_입력 > .env
)

if not exist config.json (
  echo { > config.json
  echo   "project": "KRXA_LOCAL_FULLSET", >> config.json
  echo   "mode": "local", >> config.json
  echo   "call_phrase": "GO = KRXA_VOICE_LOOP_V1", >> config.json
  echo   "primary_ai": "ChatGPT", >> config.json
  echo   "history_enabled": true, >> config.json
  echo   "auto_language_detect": true, >> config.json
  echo   "gps_priority": "reference_only", >> config.json
  echo   "speech_priority": "user_voice_first", >> config.json
  echo   "krxai_role": "secondary_learning_layer" >> config.json
  echo } >> config.json
)

if not exist storage\history\history.json (
  echo [] > storage\history\history.json
)

if not exist storage\auto_programming_events.json (
  echo [] > storage\auto_programming_events.json
)

if not exist run_local.bat (
  echo @echo off > run_local.bat
  echo cd /d C:\Users\aaa\KRXA_LOCAL_FULLSET >> run_local.bat
  echo echo =============================== >> run_local.bat
  echo echo KRXA_LOCAL_FULLSET START >> run_local.bat
  echo echo GO = KRXA_VOICE_LOOP_V1 >> run_local.bat
  echo echo =============================== >> run_local.bat
  echo python test_check.py >> run_local.bat
  echo python main.py >> run_local.bat
  echo pause >> run_local.bat
)

if not exist test_check.py (
  echo import os, json > test_check.py
  echo print("[KRXA] LOCAL_FULLSET environment check") >> test_check.py
  echo required = ["main.py","config.json",".env","storage/krxa_logs.json","storage/history/history.json"] >> test_check.py
  echo for p in required: >> test_check.py
  echo     print(("OK   " if os.path.exists(p) else "MISS ") + p) >> test_check.py
  echo print("[KRXA] check complete") >> test_check.py
)

echo [KRXA] setup complete.
echo Now run: run_local.bat
pause