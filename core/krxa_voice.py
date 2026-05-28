import os
import time
import tempfile

from fastapi import UploadFile
from fastapi.responses import Response
from openai import OpenAI

from core.krxa_store import save_stt_result, save_tts_result
from core.krxa_vad import (
    check_audio,
    check_text,
    log_vad_decision
)
from core.krxa_learning import build_language_hint_from_config

client = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))


def choose_stt_language(config=None):
    hint = build_language_hint_from_config(config)

    if hint in ["ko", "en", "ja", "zh"]:
        return hint

    return None


async def stt_with_detail(
    file: UploadFile,
    session_id: str = "",
    duration: float = 0,
    device: str = "",
    vad_config=None
):
    started = time.time()
    tmp_path = None
    audio_size = 0
    content_type = file.content_type or ""
    language_hint = "auto"

    try:
        audio_bytes = await file.read()
        audio_size = len(audio_bytes)

        ok_audio, audio_reason = check_audio(
            audio_size=audio_size,
            duration=duration,
            config=vad_config
        )

        log_vad_decision(
            ok_audio,
            "audio",
            audio_reason,
            {
                "audio_size": audio_size,
                "duration": duration,
                "content_type": content_type,
                "session_id": session_id
            }
        )

        if not ok_audio:
            save_stt_result(
                ok=False,
                text="",
                reason=audio_reason,
                audio_size=audio_size,
                duration=duration,
                content_type=content_type,
                session_id=session_id,
                device=device,
                language_hint=language_hint
            )

            return {
                "ok": False,
                "text": "",
                "reason": audio_reason,
                "audio_size": audio_size,
                "duration": duration,
                "content_type": content_type,
                "language_hint": language_hint,
                "elapsed": round(time.time() - started, 3)
            }

        with tempfile.NamedTemporaryFile(delete=False, suffix=".webm") as tmp:
            tmp.write(audio_bytes)
            tmp_path = tmp.name

        stt_language = choose_stt_language(vad_config)
        language_hint = stt_language or "auto"

        with open(tmp_path, "rb") as f:
            kwargs = {
                "model": os.getenv("OPENAI_STT_MODEL", "whisper-1"),
                "file": f
            }

            if stt_language:
                kwargs["language"] = stt_language

            tr = client.audio.transcriptions.create(**kwargs)

        text = (tr.text or "").strip()

        ok_text, text_reason = check_text(
            text=text,
            config=vad_config
        )

        log_vad_decision(
            ok_text,
            "text",
            text_reason,
            {
                "text": text,
                "language_hint": language_hint,
                "audio_size": audio_size,
                "duration": duration,
                "session_id": session_id
            }
        )

        if not ok_text:
            save_stt_result(
                ok=False,
                text=text,
                reason=text_reason,
                audio_size=audio_size,
                duration=duration,
                content_type=content_type,
                session_id=session_id,
                device=device,
                language_hint=language_hint
            )

            return {
                "ok": False,
                "text": text,
                "reason": text_reason,
                "audio_size": audio_size,
                "duration": duration,
                "content_type": content_type,
                "language_hint": language_hint,
                "elapsed": round(time.time() - started, 3)
            }

        save_stt_result(
            ok=True,
            text=text,
            reason="ok",
            audio_size=audio_size,
            duration=duration,
            content_type=content_type,
            session_id=session_id,
            device=device,
            language_hint=language_hint
        )

        return {
            "ok": True,
            "text": text,
            "reason": "ok",
            "audio_size": audio_size,
            "duration": duration,
            "content_type": content_type,
            "language_hint": language_hint,
            "elapsed": round(time.time() - started, 3)
        }

    except Exception as e:
        reason = str(e)

        save_stt_result(
            ok=False,
            text="",
            reason=reason,
            audio_size=audio_size,
            duration=duration,
            content_type=content_type,
            session_id=session_id,
            device=device,
            language_hint=language_hint
        )

        return {
            "ok": False,
            "text": "",
            "reason": reason,
            "audio_size": audio_size,
            "duration": duration,
            "content_type": content_type,
            "language_hint": language_hint,
            "elapsed": round(time.time() - started, 3)
        }

    finally:
        if tmp_path and os.path.exists(tmp_path):
            try:
                os.remove(tmp_path)
            except Exception:
                pass


async def stt(
    file: UploadFile,
    session_id: str = "",
    duration: float = 0,
    device: str = "",
    vad_config=None
):
    result = await stt_with_detail(
        file=file,
        session_id=session_id,
        duration=duration,
        device=device,
        vad_config=vad_config
    )

    return result.get("text", "") if result.get("ok") else ""


def tts_response(
    text: str,
    session_id: str = ""
):
    started = time.time()

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
            reason="ok",
            session_id=session_id
        )

        return Response(
            content=data,
            media_type="audio/mpeg",
            headers={
                "X-KRXA-TTS-Elapsed": str(round(time.time() - started, 3)),
                "X-KRXA-TTS-Audio-Size": str(len(data))
            }
        )

    except Exception as e:
        save_tts_result(
            ok=False,
            text_len=len(text or ""),
            audio_size=0,
            reason=str(e),
            session_id=session_id
        )

        return Response(
            content=b"",
            media_type="audio/mpeg",
            status_code=500,
            headers={
                "X-KRXA-TTS-Elapsed": str(round(time.time() - started, 3)),
                "X-KRXA-TTS-Error": str(e)
            }
        )