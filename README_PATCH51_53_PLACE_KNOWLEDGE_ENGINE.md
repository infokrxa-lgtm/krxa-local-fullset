# PATCH51~53 PLACE KNOWLEDGE ENGINE V1

## 실행
cd C:\Users\aaa\KRXA_LOCAL_FULLSET
copy apply_patch51_53_place_knowledge_engine_v1.py patch_inbox\
python patch_engine\patch_runner.py
type docs\PATCH51_53_PLACE_KNOWLEDGE_ENGINE_REPORT.md

## 검증
python -m py_compile core\travel_place_knowledge.py core\travel_place_knowledge_router.py
python -c "from core.travel_place_knowledge import seed_place_knowledge; print(seed_place_knowledge())"
