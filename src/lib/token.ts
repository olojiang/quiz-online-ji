import { randomBytes } from "crypto";
const B62 = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz";
/** non-guessable base62 token (~59 bits for length 10) */
export function genToken(len = 10): string {
  const bytes = randomBytes(len * 2);
  let s = "";
  for (let i = 0; s.length < len && i < bytes.length; i++) if (bytes[i] < 248) s += B62[bytes[i] % 62];
  return s.length === len ? s : genToken(len);
}
