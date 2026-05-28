import os
import tempfile
from fastapi import UploadFile
from fastapi.responses import Response
from openai import OpenAI

from core.krxa_store import save_stt_result, save_tts_result

client = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))


NOISE_WORDS = [
    "inaudible",
    "background",
    "chatter",
    "radio",
    "thanks for watching",
    "thank you for watching",
    "시청해주셔서",
    "구독",
]


def is_noise_text(text: str) -> bool:
    if not text:
        return True

    t = text.strip().lower()

    if len(t) <= 1:
        return True

    return any(w in t for w in NOISE_WORDS)


async def stt(file: UploadFile, session_id: str = "", duration: float = 0, device: str = ""):
    tmp_path = None
    audio_bytes = await file.read()
    audio_size = len(audio_bytes)

    try:
        if audio_size < 1500:
            save_stt_result(
                ok=False,
                reason="audio_too_small",
                audio_size=audio_size,
                duration=duration,
                content_type=file.content_type or "",
                session_id=session_id,
                device=device
            )
            return ""

        with tempfile.NamedTemporaryFile(delete=False, suffix=".webm") as tmp:
            tmp.write(audio_bytes)
            tmp_path = tmp.name

        with open(tmp_path, "rb") as f:
            tr = client.audio.transcriptions.create(
                model=os.getenv("OPENAI_STT_MODEL", "whisper-1"),
                file=f
            )

        text = (tr.text or "").strip()

        if is_noise_text(text):
            save_stt_result(
                ok=False,
                text=text,
                reason="noise_or_inaudible",
                audio_size=audio_size,
                duration=duration,
                content_type=file.content_type or "",
                session_id=session_id,
                device=device
            )
            return ""

        save_stt_result(
            ok=True,
            text=text,
            audio_size=audio_size,
            duration=duration,
            content_type=file.content_type or "",
            session_id=session_id,
            device=device
        )

        return text

    except Exception as e:
        save_stt_result(
            ok=False,
            reason=str(e),
            audio_size=audio_size,
            duration=duration,
            content_type=file.content_type or "",
            session_id=session_id,
            device=device
        )
        return ""

    finally:
        if tmp_path and os.path.exists(tmp_path):
            try:
                os.remove(tmp_path)
            except Exception:
                pass


def tts_response(text: str, session_id: str = ""):
    try:
        audio = client.audio.speech.create(
            model=os.getenv("OPENAI_TTS_MODEL", "gpt-4o-mini-tts"),
            voice=os.getenv("OPENAI_TTS_VOICE", "alloy"),
            input=text
        )

        data = audio.read()

        save_tts_result(
            ok=True,
            text_len=len(text or ""),
            audio_size=len(data),
            session_id=session_id
        )

        return Response(
            content=data,
            media_type="audio/mpeg"
        )

    except Exception as e:
        save_tts_result(
            ok=False,
            text_len=len(text or ""),
            reason=str(e),
            session_id=session_id
        )

        return Response(
            content=b"",
            media_type="audio/mpeg",
            status_code=500
        )