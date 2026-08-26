import { randomBytes, randomUUID } from "node:crypto";

function base32NoPadding(bytes: Uint8Array): string {
  const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";
  let bits = 0;
  let value = 0;
  let output = "";
  for (const b of bytes) {
    value = (value << 8) | b;
    bits += 8;
    while (bits >= 5) {
      output += alphabet[(value >>> (bits - 5)) & 31];
      bits -= 5;
    }
  }
  if (bits > 0) output += alphabet[(value << (5 - bits)) & 31];
  return output;
}

export function defaultIdGenerator() {
  return {
    uuid(): string {
      return randomUUID();
    },
    externalCaseNumber(nowIso: string): string {
      const year = nowIso.slice(0, 4);
      const token = base32NoPadding(randomBytes(5)).slice(0, 8);
      return `PA-${year}-${token}`;
    },
  };
}

