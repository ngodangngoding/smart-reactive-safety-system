import crypto from "node:crypto";


function base64url(input) {
  return Buffer.from(input).toString("base64url");
}

export function signToken(payload, secret, expiresInSeconds) {
  const header = { alg: "HS256", typ: "JWT" };
  const now = Math.floor(Date.now() / 1000);
  const body = { ...payload, iat: now, exp: now + expiresInSeconds };

  const data = `${base64url(JSON.stringify(header))}.${base64url(JSON.stringify(body))}`;
  const signature = crypto.createHmac("sha256", secret).update(data).digest("base64url");

  return `${data}.${signature}`;
}

export function verifyToken(token, secret) {
  const parts = typeof token === "string" ? token.split(".") : [];
  if (parts.length !== 3) throw new Error("Malformed token");

  const [headerPart, bodyPart, signaturePart] = parts;
  const data = `${headerPart}.${bodyPart}`;
  const expected = crypto.createHmac("sha256", secret).update(data).digest("base64url");

  const signatureBuffer = Buffer.from(signaturePart);
  const expectedBuffer = Buffer.from(expected);
  if (
    signatureBuffer.length !== expectedBuffer.length ||
    !crypto.timingSafeEqual(signatureBuffer, expectedBuffer)
  ) {
    throw new Error("Invalid token signature");
  }

  const payload = JSON.parse(Buffer.from(bodyPart, "base64url").toString("utf8"));
  if (typeof payload.exp === "number" && Math.floor(Date.now() / 1000) >= payload.exp) {
    throw new Error("Token expired");
  }

  return payload;
}
