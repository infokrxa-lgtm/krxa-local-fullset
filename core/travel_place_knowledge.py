
from __future__ import annotations
import sqlite3, json
from pathlib import Path
from datetime import datetime
from typing import Any, Dict, List

ROOT=Path(__file__).resolve().parents[1]
STORAGE=ROOT/'storage'; DATA=ROOT/'data'; DB=STORAGE/'travel_v1.db'

def now(): return datetime.now().isoformat(timespec='seconds')
def conn():
    STORAGE.mkdir(exist_ok=True)
    c=sqlite3.connect(DB); c.row_factory=sqlite3.Row; return c

def init_place_knowledge():
    with conn() as c:
        c.execute('CREATE TABLE IF NOT EXISTS content_sources (id TEXT PRIMARY KEY, name TEXT, type TEXT, owner TEXT, url TEXT, enabled INTEGER DEFAULT 1, approved INTEGER DEFAULT 1, priority INTEGER DEFAULT 999, updated_at TEXT)')
        c.execute('CREATE TABLE IF NOT EXISTS content_place_candidates (candidate_id TEXT PRIMARY KEY, source_id TEXT, content_title TEXT, place_name TEXT, category TEXT, region TEXT, city TEXT, menu_or_theme TEXT, confidence TEXT, status TEXT, notes TEXT, updated_at TEXT)')
        c.execute('CREATE TABLE IF NOT EXISTS place_source_links (id INTEGER PRIMARY KEY AUTOINCREMENT, place_id TEXT, candidate_id TEXT, source_id TEXT, link_type TEXT, score INTEGER DEFAULT 0, created_at TEXT)')
        c.execute('CREATE TABLE IF NOT EXISTS place_knowledge_logs (id INTEGER PRIMARY KEY AUTOINCREMENT, action TEXT, status TEXT, detail_json TEXT, created_at TEXT)')

def seed_place_knowledge(seed_path: Path|None=None)->Dict[str,Any]:
    init_place_knowledge()
    seed_path=seed_path or DATA/'travel_v1_place_knowledge_seed_v1.json'
    if not seed_path.exists(): return {'ok':False,'error':str(seed_path)}
    data=json.loads(seed_path.read_text(encoding='utf-8')); ts=now()
    with conn() as c:
        for s in data.get('sources',[]):
            sql='INSERT INTO content_sources(id,name,type,owner,url,enabled,approved,priority,updated_at) VALUES(?,?,?,?,?,?,?,?,?) ON CONFLICT(id) DO UPDATE SET name=excluded.name,type=excluded.type,owner=excluded.owner,url=excluded.url,enabled=excluded.enabled,approved=excluded.approved,priority=excluded.priority,updated_at=excluded.updated_at'
            c.execute(sql,(s.get('id'),s.get('name'),s.get('type'),s.get('owner'),s.get('url'),int(bool(s.get('enabled',True))),int(bool(s.get('approved',True))),int(s.get('priority',999)),ts))
        for p in data.get('content_candidates',[]):
            sql='INSERT INTO content_place_candidates(candidate_id,source_id,content_title,place_name,category,region,city,menu_or_theme,confidence,status,notes,updated_at) VALUES(?,?,?,?,?,?,?,?,?,?,?,?) ON CONFLICT(candidate_id) DO UPDATE SET source_id=excluded.source_id,content_title=excluded.content_title,place_name=excluded.place_name,category=excluded.category,region=excluded.region,city=excluded.city,menu_or_theme=excluded.menu_or_theme,confidence=excluded.confidence,status=excluded.status,notes=excluded.notes,updated_at=excluded.updated_at'
            c.execute(sql,(p.get('candidate_id'),p.get('source_id'),p.get('content_title'),p.get('place_name'),p.get('category'),p.get('region'),p.get('city'),p.get('menu_or_theme'),p.get('confidence'),p.get('status'),p.get('notes'),ts))
        c.execute('INSERT INTO place_knowledge_logs(action,status,detail_json,created_at) VALUES(?,?,?,?)',('seed','ok',json.dumps({'sources':len(data.get('sources',[])),'candidates':len(data.get('content_candidates',[]))},ensure_ascii=False),ts))
    return {'ok':True,'sources':len(data.get('sources',[])),'candidates':len(data.get('content_candidates',[]))}

def list_sources()->List[Dict[str,Any]]:
    init_place_knowledge()
    with conn() as c: return [dict(r) for r in c.execute('SELECT * FROM content_sources ORDER BY priority,name').fetchall()]

def list_candidates(region:str='', category:str='', status:str='', q:str='')->List[Dict[str,Any]]:
    init_place_knowledge(); where=[]; params=[]
    if region: where.append('region=?'); params.append(region)
    if category: where.append('category=?'); params.append(category)
    if status: where.append('status=?'); params.append(status)
    if q:
        where.append('(place_name LIKE ? OR content_title LIKE ? OR menu_or_theme LIKE ?)')
        params += [f'%{q}%',f'%{q}%',f'%{q}%']
    sql='SELECT * FROM content_place_candidates'
    if where: sql += ' WHERE ' + ' AND '.join(where)
    sql += ' ORDER BY region, city, place_name LIMIT 200'
    with conn() as c: return [dict(r) for r in c.execute(sql,params).fetchall()]

def recommendation_candidates(region:str='', q:str='')->Dict[str,Any]:
    rows=list_candidates(region=region,q=q)
    for r in rows:
        score=0
        if str(r.get('source_id','')).startswith('kbs'): score+=20
        if r.get('category')=='food': score+=10
        if r.get('status')=='verified': score+=30
        if r.get('status')=='needs_verification': score+=5
        r['knowledge_score']=score
    rows=sorted(rows,key=lambda x:x.get('knowledge_score',0),reverse=True)
    return {'ok':True,'count':len(rows),'items':rows}
