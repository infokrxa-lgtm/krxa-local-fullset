
from __future__ import annotations
from pathlib import Path
from datetime import datetime
from typing import Dict, Any, List
import sqlite3, json

ROOT=Path(__file__).resolve().parents[1]
STORAGE=ROOT/'storage'
DATA=ROOT/'data'
DB=STORAGE/'travel_v1.db'

def now(): return datetime.now().isoformat(timespec='seconds')

def conn():
    STORAGE.mkdir(exist_ok=True)
    c=sqlite3.connect(DB)
    c.row_factory=sqlite3.Row
    return c

def init_v2():
    with conn() as c:
        c.execute('CREATE TABLE IF NOT EXISTS travel_v2_sources (id TEXT PRIMARY KEY, name TEXT, type TEXT, url TEXT, priority INTEGER, enabled INTEGER DEFAULT 1, approved INTEGER DEFAULT 1, updated_at TEXT)')
        c.execute('CREATE TABLE IF NOT EXISTS travel_v2_regions (region TEXT PRIMARY KEY, name TEXT, url TEXT, enabled INTEGER DEFAULT 1, approved INTEGER DEFAULT 1, updated_at TEXT)')
        c.execute('CREATE TABLE IF NOT EXISTS travel_v2_local_targets (id INTEGER PRIMARY KEY AUTOINCREMENT, region TEXT, local TEXT, target_type TEXT, query TEXT, parent_region_url TEXT, status TEXT, updated_at TEXT)')
        c.execute('CREATE TABLE IF NOT EXISTS travel_v2_places (id TEXT PRIMARY KEY, name TEXT, category TEXT, region TEXT, city TEXT, source_id TEXT, status TEXT, score INTEGER DEFAULT 0, enabled INTEGER DEFAULT 1, approved INTEGER DEFAULT 0, updated_at TEXT)')
        c.execute('CREATE TABLE IF NOT EXISTS travel_v2_reflection (id TEXT PRIMARY KEY, payload_json TEXT, updated_at TEXT)')
        c.execute('CREATE TABLE IF NOT EXISTS travel_v2_logs (id INTEGER PRIMARY KEY AUTOINCREMENT, action TEXT, status TEXT, detail_json TEXT, created_at TEXT)')

def import_seed(seed_path: Path|None=None)->Dict[str,Any]:
    init_v2()
    seed_path=seed_path or DATA/'travel_v2_master_seed_v1.json'
    if not seed_path.exists():
        return {'ok':False,'error':str(seed_path)}
    data=json.loads(seed_path.read_text(encoding='utf-8'))
    ts=now()
    with conn() as c:
        for s in data.get('sources',[]):
            c.execute('INSERT INTO travel_v2_sources(id,name,type,url,priority,enabled,approved,updated_at) VALUES(?,?,?,?,?,?,?,?) ON CONFLICT(id) DO UPDATE SET name=excluded.name,type=excluded.type,url=excluded.url,priority=excluded.priority,updated_at=excluded.updated_at',
                      (s.get('id'),s.get('name'),s.get('type'),s.get('url'),int(s.get('priority',999)),1,1,ts))
        for r in data.get('region_gates',[]):
            c.execute('INSERT INTO travel_v2_regions(region,name,url,enabled,approved,updated_at) VALUES(?,?,?,?,?,?) ON CONFLICT(region) DO UPDATE SET name=excluded.name,url=excluded.url,updated_at=excluded.updated_at',
                      (r[0],r[1],r[2],1,1,ts))
        for l in data.get('local_targets',[]):
            c.execute('INSERT INTO travel_v2_local_targets(region,local,target_type,query,parent_region_url,status,updated_at) VALUES(?,?,?,?,?,?,?)',
                      (l.get('region'),l.get('local'),l.get('target_type'),l.get('query'),l.get('parent_region_url'),l.get('status','target'),ts))
        for p in data.get('sample_places',[]):
            c.execute('INSERT INTO travel_v2_places(id,name,category,region,city,source_id,status,score,enabled,approved,updated_at) VALUES(?,?,?,?,?,?,?,?,?,?,?) ON CONFLICT(id) DO UPDATE SET name=excluded.name,category=excluded.category,region=excluded.region,city=excluded.city,source_id=excluded.source_id,status=excluded.status,score=excluded.score,updated_at=excluded.updated_at',
                      (p.get('id'),p.get('name'),p.get('category'),p.get('region'),p.get('city'),p.get('source_id'),p.get('status'),int(p.get('score',0)),1,0,ts))
        c.execute('INSERT INTO travel_v2_logs(action,status,detail_json,created_at) VALUES(?,?,?,?)',
                  ('import_seed','ok',json.dumps({'sources':len(data.get('sources',[])),'regions':len(data.get('region_gates',[])),'local_targets':len(data.get('local_targets',[])),'places':len(data.get('sample_places',[]))},ensure_ascii=False),ts))
    build_reflection()
    return status()

def status()->Dict[str,Any]:
    init_v2()
    with conn() as c:
        return {
            'ok':True,
            'sources':c.execute('SELECT COUNT(*) FROM travel_v2_sources').fetchone()[0],
            'regions':c.execute('SELECT COUNT(*) FROM travel_v2_regions').fetchone()[0],
            'local_targets':c.execute('SELECT COUNT(*) FROM travel_v2_local_targets').fetchone()[0],
            'places':c.execute('SELECT COUNT(*) FROM travel_v2_places').fetchone()[0],
            'db_path':str(DB)
        }

def ux_flow()->Dict[str,Any]:
    p=DATA/'travel_v2_ux_flow_v1.json'
    if p.exists():
        return json.loads(p.read_text(encoding='utf-8'))
    return {'steps':[]}

def list_regions()->List[Dict[str,Any]]:
    init_v2()
    with conn() as c:
        return [dict(r) for r in c.execute('SELECT * FROM travel_v2_regions ORDER BY region').fetchall()]

def list_places(region:str='', category:str='')->List[Dict[str,Any]]:
    init_v2()
    where=[]; params=[]
    if region:
        where.append('region=?'); params.append(region)
    if category:
        where.append('category=?'); params.append(category)
    sql='SELECT * FROM travel_v2_places'
    if where:
        sql += ' WHERE ' + ' AND '.join(where)
    sql += ' ORDER BY score DESC, name LIMIT 100'
    with conn() as c:
        return [dict(r) for r in c.execute(sql,params).fetchall()]

def build_reflection()->Dict[str,Any]:
    init_v2()
    payload={
        'version':'Travel V2 Reflection v1',
        'created_at':now(),
        'ux':ux_flow(),
        'regions':list_regions(),
        'hero':{
            'steps':['home','discover','recommend','place','action','ai','memory'],
            'categories':['food','tour','festival','stay','shopping','hospital','transport','sos']
        },
        'places':list_places()
    }
    with conn() as c:
        c.execute('INSERT INTO travel_v2_reflection(id,payload_json,updated_at) VALUES(?,?,?) ON CONFLICT(id) DO UPDATE SET payload_json=excluded.payload_json,updated_at=excluded.updated_at',
                  ('default',json.dumps(payload,ensure_ascii=False),now()))
    out=DATA/'travel_v2_user_reflection_v1.json'
    out.write_text(json.dumps(payload,ensure_ascii=False,indent=2),encoding='utf-8')
    return {'ok':True,'reflection':payload,'path':str(out)}

def get_reflection()->Dict[str,Any]:
    init_v2()
    with conn() as c:
        row=c.execute('SELECT payload_json FROM travel_v2_reflection WHERE id=?',('default',)).fetchone()
    if row:
        return {'ok':True,'reflection':json.loads(row['payload_json'])}
    return build_reflection()
