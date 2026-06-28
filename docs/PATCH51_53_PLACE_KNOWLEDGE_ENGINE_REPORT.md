# PATCH51~53 Place Knowledge Engine V1

- 생성시간: 2026-06-29T06:59:27.365858
- main.py 백업: `C:\Users\aaa\KRXA_LOCAL_FULLSET\patch_backup\patch51_53_20260629_065927\main.py`
- main.py injection: True

## 목적
TV/YouTube/SNS/공식 관광 사이트 콘텐츠를 장소 중심으로 연결한다.

## 추가 파일
- `core/travel_place_knowledge.py`
- `core/travel_place_knowledge_router.py`
- `data/travel_v1_place_knowledge_seed_v1.json`

## 추가 API
- POST `/api/travel-v1/knowledge/seed`
- GET `/api/travel-v1/knowledge/sources`
- GET `/api/travel-v1/knowledge/candidates`
- GET `/api/travel-v1/knowledge/recommend`

## 검증 CMD
```bat
python -m py_compile core\travel_place_knowledge.py core\travel_place_knowledge_router.py
python -c "from core.travel_place_knowledge import seed_place_knowledge; print(seed_place_knowledge())"
```

## 배포 후 확인
```text
/api/travel-v1/knowledge/sources
/api/travel-v1/knowledge/candidates
/api/travel-v1/knowledge/recommend?region=서울
```

## 주의
이번 후보 장소는 `needs_verification` 상태다. 주소/전화/지도 검증 후 verified로 승격한다.
