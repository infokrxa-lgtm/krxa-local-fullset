import os
from tempfile import NamedTemporaryFile

from fastapi import UploadFile
from fastapi.responses import Response
from openai import OpenAI

client = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))


async def stt(file: UploadFile):
    suffix = ".webm"

    with NamedTemporaryFile(delete=False, suffix=suffix) as tmp:
        tmp.write(await file.read())
        tmp_path = tmp.name

    with open(tmp_path, "rb") as f:
        tr = client.audio.transcriptions.create(
            model=os.getenv("OPENAI_STT_MODEL", "whisper-1"),
            file=f
        )

    return tr.text


def tts_response(text):
    audio = client.audio.speech.create(
        model=os.getenv("OPENAI_TTS_MODEL", "gpt-4o-mini-tts"),
        voice="alloy",
        input=text
    )

    return Response(
        content=audio.read(),
        media_type="audio/mpeg"
    )