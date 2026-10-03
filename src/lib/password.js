import crypto from "node:crypto";

const KEY_LENGTH = 64;

export function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString("hex");
  const hash = crypto.scryptSync(password, salt, KEY_LENGTH).toString("hex");
  return `${salt}:${hash}`;
}

export function verifyPassword(password, storedHash) {
  const [salt, hash] = storedHash.split(":");
  if (!salt || !hash) return false;

  const hashBuffer = Buffer.from(hash, "hex");
  const candidateBuffer = crypto.scryptSync(password, salt, KEY_LENGTH);

  return (
    hashBuffer.length === candidateBuffer.length &&
    crypto.timingSafeEqual(hashBuffer, candidateBuffer)
  );
}
