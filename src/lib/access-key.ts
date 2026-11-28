import { randomInt, timingSafeEqual } from "crypto";

/** Tanpa huruf/angka yang mirip (0/o, 1/l/i) agar mudah diketik dengan remote TV. */
const ALPHABET = "23456789abcdefghjkmnpqrstuvwxyz";
const LENGTH = 8;

export function newAccessKey(): string {
  let key = "";
  for (let i = 0; i < LENGTH; i++) key += ALPHABET[randomInt(ALPHABET.length)];
  return key;
}

export function keyMatches(expected: string, given: string | null | undefined): boolean {
  if (!given) return false;
  const a = Buffer.from(expected);
  const b = Buffer.from(given.trim().toLowerCase());
  return a.length === b.length && timingSafeEqual(a, b);
}
