from __future__ import annotations
from fastapi import APIRouter, Body
from typing import Dict, Any
from datetime import datetime

router = APIRouter(prefix='/api/travel-v1/ai-dialogue', tags=['Travel V1 AI Dialogue'])

@router.post('/turn')
def travel_v1_ai_dialogue_turn(payload: Dict[str, Any] = Body(...)):
    text = payload.get('text') or payload.get('message') or payload.get('prompt') or ''
    source_lang = payload.get('source_lang', 'auto')
    target_lang = payload.get('target_lang', 'ko')
    return {
        'ok': True,
        'route': '/api/travel-v1/ai-dialogue/turn',
        'mode': 'ai_dialogue_free',
        'text': 'AI대화 루트 수신: ' + str(text),
        'reply': 'AI대화 루트 수신: ' + str(text),
        'source_lang': source_lang,
        'target_lang': target_lang,
        'allow_free_dialogue': True,
        'bypass_translation_only_limit': True,
        'allow_short_utterance': True,
        'relax_background_filter': True,
        'created_at': datetime.now().isoformat(timespec='seconds')
    }