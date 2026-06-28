
from __future__ import annotations
from fastapi import APIRouter
from .travel_place_knowledge import seed_place_knowledge, list_sources, list_candidates, recommendation_candidates

router=APIRouter(prefix='/api/travel-v1/knowledge', tags=['Travel V1 Place Knowledge'])

@router.post('/seed')
def knowledge_seed():
    return seed_place_knowledge()

@router.get('/sources')
def knowledge_sources():
    return {'ok':True,'sources':list_sources()}

@router.get('/candidates')
def knowledge_candidates(region:str='', category:str='', status:str='', q:str=''):
    return {'ok':True,'items':list_candidates(region=region,category=category,status=status,q=q)}

@router.get('/recommend')
def knowledge_recommend(region:str='', q:str=''):
    return recommendation_candidates(region=region,q=q)
