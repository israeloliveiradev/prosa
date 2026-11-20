/**
 * WAV (RIFF, PCM 16 bits, mono) para os clipes da voz no aparelho.
 *
 * O worker devolve PCM em Float32; aqui ele vira um arquivo WAV de verdade,
 * com a taxa de amostragem do modelo no cabeçalho (24 kHz no Kokoro,
 * 16/22,05/44,1 kHz no Piper). Tocar o arquivo com a taxa certa é o que
 * mantém o tom da voz: nada é reamostrado.
 */

export interface WavInfo {
  sampleRate: number;
  channels: number;
  bitsPerSample: number;
  dataOffset: number;
  dataBytes: number;
  frames: number;
  durationMs: number;
}

const HEADER_BYTES = 44;

function toBytes(input: Uint8Array | ArrayBuffer): Uint8Array {
  return input instanceof Uint8Array ? input : new Uint8Array(input);
}

function writeAscii(view: DataView, offset: number, text: string): void {
  for (let index = 0; index < text.length; index += 1) {
    view.setUint8(offset + index, text.charCodeAt(index));
  }
}

function readAscii(bytes: Uint8Array, offset: number, length: number): string {
  let out = "";
  for (let index = 0; index < length; index += 1) {
    out += String.fromCharCode(bytes[offset + index] ?? 0);
  }
  return out;
}

/** Converte uma amostra Float32 em PCM de 16 bits, com saturação nas bordas. */
export function floatToInt16(sample: number): number {
  if (!Number.isFinite(sample)) {
    return 0;
  }
  const clamped = Math.max(-1, Math.min(1, sample));
  return clamped < 0 ? Math.round(clamped * 0x8000) : Math.round(clamped * 0x7fff);
}

/** Codifica PCM mono Float32 num WAV PCM de 16 bits. */
export function encodeWav(samples: Float32Array, sampleRate: number): Uint8Array<ArrayBuffer> {
  if (!Number.isInteger(sampleRate) || sampleRate < 1_000 || sampleRate > 192_000) {
    throw new RangeError(`sampleRate inválido: ${sampleRate}`);
  }
  const dataBytes = samples.length * 2;
  const buffer = new ArrayBuffer(HEADER_BYTES + dataBytes);
  const view = new DataView(buffer);
  writeAscii(view, 0, "RIFF");
  view.setUint32(4, 36 + dataBytes, true);
  writeAscii(view, 8, "WAVE");
  writeAscii(view, 12, "fmt ");
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, 1, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * 2, true);
  view.setUint16(32, 2, true);
  view.setUint16(34, 16, true);
  writeAscii(view, 36, "data");
  view.setUint32(40, dataBytes, true);
  let offset = HEADER_BYTES;
  for (let index = 0; index < samples.length; index += 1) {
    view.setInt16(offset, floatToInt16(samples[index] ?? 0), true);
    offset += 2;
  }
  return new Uint8Array(buffer);
}

/** Lê o cabeçalho RIFF percorrendo os chunks (não supõe 44 bytes fixos). */
export function readWavInfo(input: Uint8Array | ArrayBuffer): WavInfo | null {
  const bytes = toBytes(input);
  if (bytes.byteLength < 12 || readAscii(bytes, 0, 4) !== "RIFF" || readAscii(bytes, 8, 4) !== "WAVE") {
    return null;
  }
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  let offset = 12;
  let sampleRate = 0;
  let channels = 0;
  let bitsPerSample = 0;
  while (offset + 8 <= bytes.byteLength) {
    const id = readAscii(bytes, offset, 4);
    const size = view.getUint32(offset + 4, true);
    const body = offset + 8;
    if (id === "fmt " && body + 16 <= bytes.byteLength) {
      channels = view.getUint16(body + 2, true);
      sampleRate = view.getUint32(body + 4, true);
      bitsPerSample = view.getUint16(body + 14, true);
    } else if (id === "data") {
      if (!sampleRate || !channels || !bitsPerSample) {
        return null;
      }
      const dataBytes = Math.min(size, bytes.byteLength - body);
      const frameBytes = channels * (bitsPerSample / 8);
      const frames = frameBytes > 0 ? Math.floor(dataBytes / frameBytes) : 0;
      return {
        sampleRate,
        channels,
        bitsPerSample,
        dataOffset: body,
        dataBytes,
        frames,
        durationMs: Math.round((frames / sampleRate) * 1000),
      };
    }
    offset = body + size + (size % 2);
  }
  return null;
}

/** Decodifica um WAV PCM de 16 bits (primeiro canal) de volta para Float32. */
export function decodeWav(input: Uint8Array | ArrayBuffer): { samples: Float32Array; sampleRate: number } | null {
  const bytes = toBytes(input);
  const info = readWavInfo(bytes);
  if (!info || info.bitsPerSample !== 16) {
    return null;
  }
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const samples = new Float32Array(info.frames);
  const stride = info.channels * 2;
  for (let frame = 0; frame < info.frames; frame += 1) {
    samples[frame] = view.getInt16(info.dataOffset + frame * stride, true) / 0x8000;
  }
  return { samples, sampleRate: info.sampleRate };
}

/** Junta pedaços de PCM na ordem. */
export function concatFloat32(parts: readonly Float32Array[]): Float32Array {
  const total = parts.reduce((sum, part) => sum + part.length, 0);
  const out = new Float32Array(total);
  let offset = 0;
  for (const part of parts) {
    out.set(part, offset);
    offset += part.length;
  }
  return out;
}
