import base64

from fastapi import FastAPI, HTTPException
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
    text: str = Field(min_length=1, max_length=4000)
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
    voice = pick_voice(body.lang, body.voice)
    communicate = edge_tts.Communicate(body.text, voice, boundary="WordBoundary")
    audio = bytearray()
    words: list[WordMark] = []
    async for chunk in communicate.stream():
        kind = chunk["type"]
        if kind == "audio" and chunk["data"]:
            audio.extend(chunk["data"])
        elif kind == "WordBoundary" and chunk["text"]:
            words.append(WordMark(text=str(chunk["text"]), offset_ms=int(chunk["offset"]) // 10_000))
    if not audio:
        raise HTTPException(status_code=502, detail="Neural voice returned no audio")
    return SpeakResponse(audio_base64=base64.b64encode(bytes(audio)).decode("ascii"), words=words)


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
