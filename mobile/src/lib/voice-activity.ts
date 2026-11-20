/**
 * Detecção simples de voz numa gravação (web), antes de mandar para a nota de pronúncia.
 *
 * Os transcritores "alucinam" sobre silêncio (um "Hello" inventado ganhava nota). Uma
 * gravação sem energia de voz não vai para o servidor: a tentativa vale 0 e não paga XP.
 *
 * Regra: janelas de 20 ms com RMS acima de VOICE_RMS somando pelo menos MIN_VOICED_MS.
 */
export const VOICE_RMS = 0.02;
export const MIN_VOICED_MS = 250;
const WINDOW_MS = 20;

/** Mede amostras mono. Exportado para teste. */
export function voicedMilliseconds(samples: Float32Array, sampleRate: number): number {
  const size = Math.max(1, Math.round((sampleRate * WINDOW_MS) / 1000));
  let voiced = 0;
  for (let start = 0; start + size <= samples.length; start += size) {
    let sum = 0;
    for (let i = start; i < start + size; i += 1) {
      const value = samples[i] ?? 0;
      sum += value * value;
    }
    if (Math.sqrt(sum / size) >= VOICE_RMS) {
      voiced += WINDOW_MS;
    }
  }
  return voiced;
}

export function hasVoice(samples: Float32Array, sampleRate: number): boolean {
  return voicedMilliseconds(samples, sampleRate) >= MIN_VOICED_MS;
}

/**
 * true/false quando deu para medir; null quando não deu (nativo, formato que o navegador
 * não decodifica): aí quem decide é o servidor.
 */
export async function recordingHasVoice(blob: Blob): Promise<boolean | null> {
  const Context =
    typeof window !== "undefined"
      ? (window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext)
      : undefined;
  if (!Context) {
    return null;
  }
  let context: AudioContext | null = null;
  try {
    context = new Context();
    const buffer = await context.decodeAudioData(await blob.arrayBuffer());
    for (let channel = 0; channel < buffer.numberOfChannels; channel += 1) {
      if (hasVoice(buffer.getChannelData(channel), buffer.sampleRate)) {
        return true;
      }
    }
    return false;
  } catch {
    return null;
  } finally {
    void context?.close().catch(() => undefined);
  }
}
