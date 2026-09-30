import base64
import json

from fastapi import FastAPI, HTTPException, Request
from fastapi.responses import StreamingResponse
from pydantic import BaseModel, Field
import edge_tts

app = FastAPI()

VOICES = {
    "en-US-AvaNeural": "en",
    "en-US-AndrewNeural": "en",
    "en-US-EmmaNeural": "en",
    "en-US-BrianNeural": "en",
    "es-ES-ElviraNeural": "es",
    "es-ES-AlvaroNeural": "es",
    "es-MX-DaliaNeural": "es",
    "es-MX-JorgeNeural": "es",
    "de-DE-KatjaNeural": "de",
    "de-DE-ConradNeural": "de",
    "fr-FR-DeniseNeural": "fr",
    "fr-FR-HenriNeural": "fr",
    "it-IT-ElsaNeural": "it",
    "it-IT-DiegoNeural": "it",
    "ru-RU-SvetlanaNeural": "ru",
    "ru-RU-DmitryNeural": "ru",
    "pt-BR-FranciscaNeural": "pt",
    "pt-BR-AntonioNeural": "pt",
    "ja-JP-NanamiNeural": "ja",
    "ja-JP-KeitaNeural": "ja",
}

DEFAULTS = {
    "en": "en-US-AvaNeural",
    "es": "es-ES-ElviraNeural",
    "de": "de-DE-KatjaNeural",
    "fr": "fr-FR-DeniseNeural",
    "it": "it-IT-ElsaNeural",
    "ru": "ru-RU-SvetlanaNeural",
    "ja": "ja-JP-NanamiNeural",
    "pt": "pt-BR-FranciscaNeural",
}


class SpeakRequest(BaseModel):
    text: str = Field(min_length=1, max_length=8000)
    lang: str = "en"
    voice: str | None = None


class WordMark(BaseModel):
    text: str
    offset_ms: int


class SpeakResponse(BaseModel):
    audio_base64: str
    words: list[WordMark]


@app.get("/health")
def health() -> dict[str, str]:
    return {"status": "ok"}


@app.post("/v1/speak", response_model=SpeakResponse)
async def speak(body: SpeakRequest) -> SpeakResponse:
    audio = bytearray()
    words: list[WordMark] = []
    async for kind, payload in iter_speech(body):
        if kind == "audio":
            audio.extend(payload)
        elif kind == "word":
            words.append(payload)
    if not audio:
        raise HTTPException(status_code=502, detail="Neural voice returned no audio")
    return SpeakResponse(audio_base64=base64.b64encode(bytes(audio)).decode("ascii"), words=words)


@app.post("/v1/speak/stream")
async def speak_stream(body: SpeakRequest, request: Request) -> StreamingResponse:
    return StreamingResponse(
        stream_speech(body, request),
        media_type="text/event-stream",
        headers={"Cache-Control": "no-store", "X-Accel-Buffering": "no"},
    )


async def stream_speech(body: SpeakRequest, request: Request):
    try:
        sent_audio = False
        async for kind, payload in iter_speech(body):
            if await request.is_disconnected():
                return
            if kind == "audio":
                sent_audio = True
                yield sse("audio", base64.b64encode(payload).decode("ascii"))
            elif kind == "word":
                yield sse("word", {"text": payload.text, "offset_ms": payload.offset_ms})
        if not sent_audio:
            yield sse("error", {"message": "Neural voice returned no audio"})
            return
        yield sse("done", {})
    except HTTPException as error:
        yield sse("error", {"message": error.detail if isinstance(error.detail, str) else "Neural voice is unavailable"})
    except Exception:
        yield sse("error", {"message": "Neural voice is unavailable"})


async def iter_speech(body: SpeakRequest):
    voice = pick_voice(body.lang, body.voice)
    communicate = edge_tts.Communicate(body.text, voice, boundary="WordBoundary")
    async for chunk in communicate.stream():
        kind = chunk["type"]
        if kind == "audio" and chunk["data"]:
            yield "audio", chunk["data"]
        elif kind == "WordBoundary" and chunk["text"]:
            yield "word", WordMark(text=str(chunk["text"]), offset_ms=int(chunk["offset"]) // 10_000)


def sse(event: str, data: str | dict) -> str:
    payload = data if isinstance(data, str) else json.dumps(data, separators=(",", ":"))
    return f"event: {event}\ndata: {payload}\n\n"


def pick_voice(lang: str, requested: str | None) -> str:
    code = lang.strip().lower().split("-", 1)[0]
    if requested:
        if VOICES.get(requested) != code:
            raise HTTPException(status_code=400, detail="Unsupported voice")
        return requested
    voice = DEFAULTS.get(code)
    if voice is None:
        raise HTTPException(status_code=400, detail="Unsupported language")
    return voice
