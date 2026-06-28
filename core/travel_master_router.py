
from __future__ import annotations
from fastapi import APIRouter
from .travel_master_db import import_master_seed, status, list_sources, list_region_gates, search_places, export_master_json

router=APIRouter(prefix='/api/travel-v1/master', tags=['Travel V1 Master DB'])

@router.post('/import-seed')
def master_import_seed():
    return import_master_seed()

@router.get('/status')
def master_status():
    return status()

@router.get('/sources')
def master_sources():
    return {'ok':True,'sources':list_sources()}

@router.get('/regions')
def master_regions():
    return {'ok':True,'regions':list_region_gates()}

@router.get('/places')
def master_places(region:str='', category:str='', q:str='', status:str=''):
    return {'ok':True,'places':search_places(region=region,category=category,q=q,status_filter=status)}

@router.post('/export-json')
def master_export_json():
    return export_master_json()
