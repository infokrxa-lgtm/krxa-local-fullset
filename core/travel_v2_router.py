
from __future__ import annotations
from fastapi import APIRouter
from .travel_v2_engine import import_seed, status, ux_flow, list_regions, list_places, build_reflection, get_reflection

router=APIRouter(prefix='/api/travel-v2', tags=['Travel V2'])

@router.post('/import-seed')
def api_import_seed():
    return import_seed()

@router.get('/status')
def api_status():
    return status()

@router.get('/ux-flow')
def api_ux_flow():
    return {'ok':True,'ux':ux_flow()}

@router.get('/regions')
def api_regions():
    return {'ok':True,'regions':list_regions()}

@router.get('/places')
def api_places(region:str='', category:str=''):
    return {'ok':True,'places':list_places(region=region,category=category)}

@router.post('/reflection/build')
def api_reflection_build():
    return build_reflection()

@router.get('/reflection')
def api_reflection():
    return get_reflection()
