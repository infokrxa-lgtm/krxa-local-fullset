# PATCH48~50 Final Executable Program V1

- 생성시간: 2026-06-29T06:00:47.011039
- main.py 백업: `C:\Users\aaa\KRXA_LOCAL_FULLSET\patch_backup\patch48_50_20260629_060046\main.py`
- main.py router injection: True

## 추가 코드
- core/travel_db.py
- core/travel_api_router.py
- core/travel_auto_updater.py
- core/travel_scheduler.py
- core/travel_map.py
- data/travel_v1_korea_tour_sources_seed_v1.json

## 추가 API
- GET /api/travel-v1/status
- POST /api/travel-v1/db/init
- POST /api/travel-v1/db/update/run
- GET /api/travel-v1/sources
- POST /api/travel-v1/sources/save
- POST /api/travel-v1/sources/state
- POST /api/travel-v1/sources/delete
- POST /api/travel-v1/user-sources/save
- GET /api/travel-v1/user-ui-reflection
- GET /api/travel-v1/places/search
- GET /api/travel-v1/festivals
- GET /api/travel-v1/map-url
- GET /api/travel-v1/m2m-boundary

## 검증 CMD
```bat
python -m py_compile core\travel_db.py core\travel_api_router.py core\travel_auto_updater.py core\travel_scheduler.py core\travel_map.py
python -c "from core.travel_auto_updater import run_update; print(run_update('cmd_test'))"
```

## Git 선택 add
```bat
git add main.py
git add core\travel_db.py core\travel_api_router.py core\travel_auto_updater.py core\travel_scheduler.py core\travel_map.py
git add data\travel_v1_korea_tour_sources_seed_v1.json
git add README_PATCH48_50_FINAL_EXECUTABLE_PROGRAM.md
git add docs\PATCH48_50_FINAL_EXECUTABLE_PROGRAM_REPORT.md docs\PATCH48_50_FINAL_EXECUTABLE_PROGRAM_REPORT.json
```
