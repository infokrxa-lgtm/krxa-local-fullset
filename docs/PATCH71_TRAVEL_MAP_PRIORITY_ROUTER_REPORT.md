# PATCH71 Travel Map Priority Router V1

- 생성시간: 2026-06-29T23:32:02.086600
- 결정: 한국은 NAVER Map 우선, Google Maps 백업. 해외는 국가별 지도 프로필 우선, Google Maps 백업.

## 구조

```text
사용자 GPS 현재 위치 = 출발지
KRXA 선택 장소 = 목적지
한국: NAVER → Google
해외: 국가별 지도 프로필 → Google
사용자 provider 등록/삭제 가능
```

## 검증 CMD

```bat
python -m py_compile core\travel_map_priority.py core\travel_map_priority_router.py
python -c "from core.travel_map_priority import status, direction_urls; print(status()); print(direction_urls(country_code='KR', start_lat='37.5', start_lng='127.0', dest_lat='37.52', dest_lng='126.90', dest_name='복담복국'))"
findstr /n "PATCH71_TRAVEL_MAP_PRIORITY_ROUTER" main.py
findstr /n "travel_map_priority" ui\app.html
```

## 변경

```json
[
  "created data/travel_v2_map_priority_seed_v1.json",
  "created core/travel_map_priority.py",
  "created core/travel_map_priority_router.py",
  "created ui/js/travel_map_priority.js",
  "loaded travel_map_priority.js in ui/app.html",
  "included travel_map_priority_router in main.py"
]
```

## 경고

```json
[]
```
