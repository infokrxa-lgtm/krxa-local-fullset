from core.krxa_store import log_event


BACKGROUND_PATTERNS = [
    "시청해 주셔서 감사합니다",
    "오늘도 시청해 주셔서 감사합니다",
    "구독",
    "좋아요",
    "알림 설정",
    "뉴스입니다",
    "광고",
    "방송",
    "라디오",
    "background",
    "inaudible",
    "chatter",
    "noise",
    "music",
    "thanks for watching",
    "thank you for watching",
]


REQUEST_PATTERNS = [
    "어디",
    "어떻게",
    "알려",
    "추천",
    "주세요",
    "가나요",
    "있나요",
    "되나요",
    "맞나요",
    "부탁",
    "찾아",
    "길",
    "위치",
    "맛집",
    "호텔",
    "공항",
    "택시",
    "식당",
    "화장실",
    "도와",
    "?",
]


COMMAND_PATTERNS = [
    "가자",
    "해줘",
    "보여줘",
    "찾아줘",
    "통역",
    "번역",
    "말해줘",
    "안내해줘",
]


SHORT_VALID_WORDS = [
    "네",
    "아니요",
    "안녕",
    "안녕하세요",
    "고마워",
    "감사합니다",
    "여기",
    "저기",
    "좋아요",
    "맞아요",
    "아니",
]


def normalize(text: str) -> str:
    return (text or "").strip()


def contains_any(text: str, patterns):
    lowered = text.lower()
    return any(p.lower() in lowered for p in patterns)


def judge_utterance(text: str, source="stt", context=None):
    """
    STT 결과가 실제 사용자 발화인지 판단한다.
    목적:
    - TV/유튜브/라디오 배경음 차단
    - 질문형/요청형/명령형 사용자 발화 우선 통과
    - 짧은 자연 대답은 통과
    """
    context = context or {}
    clean = normalize(text)

    result = {
        "ok": False,
        "utterance_type": "unknown",
        "reason": "",
        "score": 0,
        "text": clean
    }

    if not clean:
        result["reason"] = "empty_text"
        log_event("utterance_block", result)
        return result

    if contains_any(clean, BACKGROUND_PATTERNS):
        result["reason"] = "background_pattern"
        result["utterance_type"] = "background"
        result["score"] = -10
        log_event("utterance_block", result)
        return result

    if len(clean) <= 1:
        result["reason"] = "too_short"
        result["utterance_type"] = "too_short"
        result["score"] = -3
        log_event("utterance_block", result)
        return result

    score = 0
    utterance_type = "statement"

    if contains_any(clean, REQUEST_PATTERNS):
        score += 5
        utterance_type = "request_or_question"

    if contains_any(clean, COMMAND_PATTERNS):
        score += 4
        utterance_type = "command"

    if clean in SHORT_VALID_WORDS:
        score += 3
        utterance_type = "short_valid"

    if clean.endswith(("?", "요", "까", "나", "줘", "세요", "다")):
        score += 1

    if len(clean) >= 3:
        score += 1

    if score >= 2:
        result.update({
            "ok": True,
            "utterance_type": utterance_type,
            "reason": "accepted",
            "score": score
        })
        log_event("utterance_pass", result)
        return result

    result.update({
        "ok": False,
        "utterance_type": "uncertain",
        "reason": "low_utterance_score",
        "score": score
    })
    log_event("utterance_block", result)
    return result