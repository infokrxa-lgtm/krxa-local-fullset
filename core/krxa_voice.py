import os
import tempfile

from fastapi import UploadFile
from fastapi.responses import Response
from openai import OpenAI

client = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))


async def stt(file: UploadFile):
    tmp_path = None

    try:
        with tempfile.NamedTemporaryFile(delete=False, suffix=".webm") as tmp:
            tmp.write(await file.read())
            tmp_path = tmp.name

        with open(tmp_path, "rb") as f:
            tr = client.audio.transcriptions.create(
                model=os.getenv("OPENAI_STT_MODEL", "whisper-1"),
                file=f
            )

        return tr.text

    finally:
        if tmp_path and os.path.exists(tmp_path):
            try:
                os.remove(tmp_path)
            except Exception:
                pass


def tts_response(text):
    audio = client.audio.speech.create(
        model=os.getenv("OPENAI_TTS_MODEL", "gpt-4o-mini-tts"),
        voice=os.getenv("OPENAI_TTS_VOICE", "alloy"),
        input=text
    )

    return Response(
        content=audio.read(),
        media_type="audio/mpeg"
    )