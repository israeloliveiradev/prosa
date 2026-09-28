import { createHmac, randomBytes, timingSafeEqual } from "node:crypto";

const ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";

export function generateTotpSecret(): string {
  return base32Encode(randomBytes(20));
}

export function totpCode(secret: string, at = Date.now(), step = 30): string {
  const counter = Math.floor(at / 1000 / step);
  return hotp(secret, counter);
}

export function verifyTotp(secret: string, code: string, at = Date.now()): boolean {
  const trimmed = code.replace(/\s/g, "");
  if (!/^\d{6}$/.test(trimmed)) {
    return false;
  }
  const expected = Buffer.from(trimmed);
  for (const drift of [-1, 0, 1]) {
    const candidate = Buffer.from(totpCode(secret, at + drift * 30_000));
    if (candidate.length === expected.length && timingSafeEqual(candidate, expected)) {
      return true;
    }
  }
  return false;
}

export function otpauthUrl(email: string, secret: string): string {
  const label = encodeURIComponent(`Prosa:${email}`);
  return `otpauth://totp/${label}?secret=${secret}&issuer=Prosa&digits=6&period=30`;
}

function hotp(secret: string, counter: number): string {
  const key = base32Decode(secret);
  const buffer = Buffer.alloc(8);
  buffer.writeBigUInt64BE(BigInt(counter));
  const digest = createHmac("sha1", key).update(buffer).digest();
  const offset = digest[digest.length - 1]! & 0x0f;
  const binary =
    ((digest[offset]! & 0x7f) << 24) |
    ((digest[offset + 1]! & 0xff) << 16) |
    ((digest[offset + 2]! & 0xff) << 8) |
    (digest[offset + 3]! & 0xff);
  return String(binary % 1_000_000).padStart(6, "0");
}

function base32Encode(bytes: Buffer): string {
  let bits = "";
  for (const byte of bytes) {
    bits += byte.toString(2).padStart(8, "0");
  }
  let output = "";
  for (let index = 0; index < bits.length; index += 5) {
    const slice = bits.slice(index, index + 5).padEnd(5, "0");
    output += ALPHABET[Number.parseInt(slice, 2)];
  }
  return output;
}

function base32Decode(value: string): Buffer {
  const clean = value.replace(/=+$/, "").toUpperCase();
  let bits = "";
  for (const char of clean) {
    const index = ALPHABET.indexOf(char);
    if (index < 0) {
      continue;
    }
    bits += index.toString(2).padStart(5, "0");
  }
  const bytes: number[] = [];
  for (let index = 0; index + 8 <= bits.length; index += 8) {
    bytes.push(Number.parseInt(bits.slice(index, index + 8), 2));
  }
  return Buffer.from(bytes);
}
