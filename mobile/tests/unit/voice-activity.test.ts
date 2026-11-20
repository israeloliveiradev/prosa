import { expect, test } from "@playwright/test";
import { MIN_VOICED_MS, hasVoice, voicedMilliseconds } from "../../src/lib/voice-activity";

const RATE = 16_000;

function tone(seconds: number, amplitude: number): Float32Array {
  const out = new Float32Array(Math.round(seconds * RATE));
  for (let i = 0; i < out.length; i += 1) {
    out[i] = amplitude * Math.sin((2 * Math.PI * 220 * i) / RATE);
  }
  return out;
}

test.describe("voice activity", () => {
  test("silêncio não tem voz", () => {
    expect(voicedMilliseconds(new Float32Array(RATE * 2), RATE)).toBe(0);
    expect(hasVoice(new Float32Array(RATE * 2), RATE)).toBe(false);
  });

  test("ruído de fundo baixo não conta como voz", () => {
    expect(hasVoice(tone(2, 0.005), RATE)).toBe(false);
  });

  test("fala (energia moderada) por tempo suficiente conta", () => {
    expect(hasVoice(tone(1, 0.2), RATE)).toBe(true);
  });

  test("um estalo curto não basta", () => {
    const samples = new Float32Array(RATE * 2);
    samples.set(tone((MIN_VOICED_MS - 100) / 1000, 0.3), 0);
    expect(hasVoice(samples, RATE)).toBe(false);
  });
});
