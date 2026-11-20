import { test, expect } from "@playwright/test";
import { concatFloat32, decodeWav, encodeWav, floatToInt16, readWavInfo } from "@/lib/wav";

test.describe("WAV dos clipes de voz", () => {
  test("cabeçalho RIFF com a taxa de amostragem do modelo", () => {
    for (const rate of [16000, 22050, 24000, 44100]) {
      const samples = new Float32Array(rate / 10);
      const wav = encodeWav(samples, rate);
      expect(wav.byteLength).toBe(44 + samples.length * 2);
      const info = readWavInfo(wav);
      expect(info).toEqual({
        sampleRate: rate,
        channels: 1,
        bitsPerSample: 16,
        dataOffset: 44,
        dataBytes: samples.length * 2,
        frames: samples.length,
        durationMs: 100,
      });
      const text = new TextDecoder().decode(wav.subarray(0, 4)) + new TextDecoder().decode(wav.subarray(8, 16));
      expect(text).toBe("RIFFWAVEfmt ");
    }
  });

  test("ida e volta preserva as amostras (16 bits)", () => {
    const samples = new Float32Array([0, 0.5, -0.5, 0.25, -1, 1, 0.999, -0.001]);
    const decoded = decodeWav(encodeWav(samples, 24000));
    expect(decoded?.sampleRate).toBe(24000);
    expect(decoded?.samples.length).toBe(samples.length);
    samples.forEach((value, index) => {
      expect(Math.abs((decoded?.samples[index] ?? 99) - value)).toBeLessThan(1 / 16000);
    });
  });

  test("satura fora de [-1, 1] e zera NaN", () => {
    expect(floatToInt16(2)).toBe(32767);
    expect(floatToInt16(-2)).toBe(-32768);
    expect(floatToInt16(Number.NaN)).toBe(0);
    expect(floatToInt16(0)).toBe(0);
  });

  test("lê chunks extras antes de data (cabeçalhos que não têm 44 bytes)", () => {
    const base = encodeWav(new Float32Array([0.1, 0.2, 0.3]), 22050);
    const extra = new Uint8Array(base.byteLength + 12);
    extra.set(base.subarray(0, 36), 0);
    extra.set(new TextEncoder().encode("LIST"), 36);
    new DataView(extra.buffer).setUint32(40, 4, true);
    extra.set(new TextEncoder().encode("INFO"), 44);
    extra.set(base.subarray(36), 48);
    const info = readWavInfo(extra);
    expect(info?.sampleRate).toBe(22050);
    expect(info?.dataOffset).toBe(56);
    expect(info?.frames).toBe(3);
  });

  test("recusa o que não é WAV e taxa inválida", () => {
    expect(readWavInfo(new Uint8Array([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]))).toBeNull();
    expect(() => encodeWav(new Float32Array(4), 0)).toThrow();
  });

  test("concatena pedaços de PCM na ordem", () => {
    const joined = concatFloat32([new Float32Array([1, 2]), new Float32Array([]), new Float32Array([3])]);
    expect([...joined]).toEqual([1, 2, 3]);
  });
});
