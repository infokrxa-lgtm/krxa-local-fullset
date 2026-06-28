
from __future__ import annotations
import sqlite3, json, csv
from pathlib import Path
from datetime import datetime
from typing import Dict, Any, List

ROOT=Path(__file__).resolve().parents[1]
STORAGE=ROOT/'storage'; DATA=ROOT/'data'
DB=STORAGE/'travel_v1.db'

def now(): return datetime.now().isoformat(timespec='seconds')
def conn():
    STORAGE.mkdir(exist_ok=True)
    c=sqlite3.connect(DB); c.row_factory=sqlite3.Row; return c

def init_master_db():
    with conn() as c:
        c.execute('CREATE TABLE IF NOT EXISTS master_sources (source_id TEXT PRIMARY KEY, name TEXT, type TEXT, region_scope TEXT, region TEXT, url TEXT, enabled INTEGER DEFAULT 1, approved INTEGER DEFAULT 1, priority INTEGER DEFAULT 999, verification_status TEXT, updated_at TEXT)')
        c.execute('CREATE TABLE IF NOT EXISTS master_region_gates (region TEXT PRIMARY KEY, name TEXT, url TEXT, enabled INTEGER DEFAULT 1, approved INTEGER DEFAULT 1, updated_at TEXT)')
        c.execute('CREATE TABLE IF NOT EXISTS master_places (place_id TEXT PRIMARY KEY, name TEXT, category TEXT, region TEXT, city TEXT, district TEXT, address TEXT, phone TEXT, official_url TEXT, source_id TEXT, source_type TEXT, tags_json TEXT, status TEXT, score INTEGER DEFAULT 0, enabled INTEGER DEFAULT 1, approved INTEGER DEFAULT 0, updated_at TEXT)')
        c.execute('CREATE TABLE IF NOT EXISTS master_import_logs (id INTEGER PRIMARY KEY AUTOINCREMENT, action TEXT, status TEXT, detail_json TEXT, created_at TEXT)')

def import_master_seed(seed_path: Path|None=None)->Dict[str,Any]:
    init_master_db()
    seed_path=seed_path or DATA/'travel_v1_master_seed_v1.json'
    if not seed_path.exists(): return {'ok':False,'error':str(seed_path)}
    data=json.loads(seed_path.read_text(encoding='utf-8'))
    ts=now()
    with conn() as c:
        for s in data.get('sources',[]):
            c.execute('INSERT INTO master_sources(source_id,name,type,region_scope,region,url,enabled,approved,priority,verification_status,updated_at) VALUES(?,?,?,?,?,?,?,?,?,?,?) ON CONFLICT(source_id) DO UPDATE SET name=excluded.name,type=excluded.type,region_scope=excluded.region_scope,region=excluded.region,url=excluded.url,enabled=excluded.enabled,approved=excluded.approved,priority=excluded.priority,verification_status=excluded.verification_status,updated_at=excluded.updated_at',
            (s.get('source_id'),s.get('name'),s.get('type'),s.get('region_scope'),s.get('region'),s.get('url'),int(s.get('enabled',1)),int(s.get('approved',1)),int(s.get('priority',999)),s.get('verification_status',''),ts))
        for r in data.get('region_gates',[]):
            c.execute('INSERT INTO master_region_gates(region,name,url,enabled,approved,updated_at) VALUES(?,?,?,?,?,?) ON CONFLICT(region) DO UPDATE SET name=excluded.name,url=excluded.url,enabled=excluded.enabled,approved=excluded.approved,updated_at=excluded.updated_at',
            (r[0],r[1],r[2],1,1,ts))
        for p in data.get('place_candidates',[]):
            c.execute('INSERT INTO master_places(place_id,name,category,region,city,district,address,phone,official_url,source_id,source_type,tags_json,status,score,enabled,approved,updated_at) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?) ON CONFLICT(place_id) DO UPDATE SET name=excluded.name,category=excluded.category,region=excluded.region,city=excluded.city,district=excluded.district,address=excluded.address,phone=excluded.phone,official_url=excluded.official_url,source_id=excluded.source_id,source_type=excluded.source_type,tags_json=excluded.tags_json,status=excluded.status,score=excluded.score,enabled=excluded.enabled,approved=excluded.approved,updated_at=excluded.updated_at',
            (p.get('place_id'),p.get('name'),p.get('category'),p.get('region'),p.get('city'),p.get('district',''),p.get('address',''),p.get('phone',''),p.get('official_url',''),p.get('source_id'),p.get('source_type'),json.dumps(p.get('tags',[]),ensure_ascii=False),p.get('status','candidate'),int(p.get('score',0)),1,0,ts))
        c.execute('INSERT INTO master_import_logs(action,status,detail_json,created_at) VALUES(?,?,?,?)',('import_master_seed','ok',json.dumps({'sources':len(data.get('sources',[])),'region_gates':len(data.get('region_gates',[])),'places':len(data.get('place_candidates',[]))},ensure_ascii=False),ts))
    return {'ok':True,'sources':len(data.get('sources',[])),'region_gates':len(data.get('region_gates',[])),'places':len(data.get('place_candidates',[]))}

def status()->Dict[str,Any]:
    init_master_db()
    with conn() as c:
        return {'ok':True,'sources':c.execute('SELECT COUNT(*) FROM master_sources').fetchone()[0],'region_gates':c.execute('SELECT COUNT(*) FROM master_region_gates').fetchone()[0],'places':c.execute('SELECT COUNT(*) FROM master_places').fetchone()[0],'db_path':str(DB)}

def list_sources()->List[Dict[str,Any]]:
    init_master_db()
    with conn() as c: return [dict(r) for r in c.execute('SELECT * FROM master_sources ORDER BY priority,name').fetchall()]

def list_region_gates()->List[Dict[str,Any]]:
    init_master_db()
    with conn() as c: return [dict(r) for r in c.execute('SELECT * FROM master_region_gates ORDER BY region').fetchall()]

def search_places(region:str='', category:str='', q:str='', status_filter:str='')->List[Dict[str,Any]]:
    init_master_db(); where=[]; params=[]
    if region: where.append('region=?'); params.append(region)
    if category: where.append('category=?'); params.append(category)
    if status_filter: where.append('status=?'); params.append(status_filter)
    if q:
        where.append('(name LIKE ? OR city LIKE ? OR tags_json LIKE ?)')
        params += [f'%{q}%',f'%{q}%',f'%{q}%']
    sql='SELECT * FROM master_places'
    if where: sql += ' WHERE ' + ' AND '.join(where)
    sql += ' ORDER BY score DESC, region, city, name LIMIT 200'
    with conn() as c: return [dict(r) for r in c.execute(sql,params).fetchall()]

def export_master_json(out_path: Path|None=None)->Dict[str,Any]:
    init_master_db(); out_path=out_path or DATA/'travel_v1_master_export.json'
    payload={'exported_at':now(),'status':status(),'sources':list_sources(),'region_gates':list_region_gates(),'places':search_places()}
    out_path.write_text(json.dumps(payload,ensure_ascii=False,indent=2),encoding='utf-8')
    return {'ok':True,'path':str(out_path)}
