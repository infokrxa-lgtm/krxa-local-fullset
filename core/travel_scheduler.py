
from __future__ import annotations
import threading, time
from datetime import datetime, timedelta, timezone
from .travel_auto_updater import run_update

KST = timezone(timedelta(hours=9))
_started = False

def is_thursday_1am_kst(dt=None) -> bool:
    dt = dt or datetime.now(KST)
    return dt.weekday() == 3 and dt.hour == 1 and dt.minute == 0

def _loop():
    last_key = None
    while True:
        now = datetime.now(KST)
        key = now.strftime("%Y%m%d%H%M")
        if is_thursday_1am_kst(now) and key != last_key:
            try:
                run_update(mode="weekly_thursday_0100_kst")
            except Exception as e:
                print("[TravelV1 Scheduler Error]", repr(e))
            last_key = key
        time.sleep(30)

def start_travel_scheduler():
    global _started
    if _started:
        return {"ok": True, "already_started": True}
    t = threading.Thread(target=_loop, daemon=True)
    t.start()
    _started = True
    return {"ok": True, "started": True, "schedule": "weekly Thursday 01:00 KST"}
