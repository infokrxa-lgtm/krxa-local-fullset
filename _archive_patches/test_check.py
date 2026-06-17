print("[KRXA] LOCAL_FULLSET environment check"
required = ["main.py","config.json",".env","storage/krxa_logs.json","storage/history/history.json"] 
for p in required: 
    print(("OK   " if os.path.exists(p) else "MISS ") + p) 
print("[KRXA] check complete") 
