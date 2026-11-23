import { randomBytes, scryptSync, timingSafeEqual } from "node:crypto";

const N = 16384;
const R = 8;
const P = 1;
const KEYLEN = 64;

export function hashPassword(password: string): string {
  const salt = randomBytes(16);
  const hash = scryptSync(password, salt, KEYLEN, { N, r: R, p: P });
  return `scrypt$${N}$${R}$${P}$${salt.toString("hex")}$${hash.toString("hex")}`;
}

/** Verifies scrypt hashes; falls back to legacy plain-text compare for old rows. */
export function verifyPassword(password: string, stored: string): boolean {
  if (!stored) return false;
  try {
    const parts = stored.split("$");
    if (parts[0] !== "scrypt" || parts.length !== 6) {
      return stored === password;
    }
    const [, nStr, rStr, pStr, saltHex, hashHex] = parts;
    const expected = Buffer.from(hashHex, "hex");
    const hash = scryptSync(password, Buffer.from(saltHex, "hex"), expected.length, {
      N: Number(nStr),
      r: Number(rStr),
      p: Number(pStr),
    });
    return timingSafeEqual(hash, expected);
  } catch {
    return false;
  }
}

export function isHashedPassword(stored: string): boolean {
  return stored.startsWith("scrypt$");
}
