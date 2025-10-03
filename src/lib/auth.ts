import crypto from "crypto";

const DEFAULT_SECRET = "change-me-dev-secret";

export function getAdminSecret(): string {
  return process.env.ADMIN_SECRET || DEFAULT_SECRET;
}

export function signToken(payload: Record<string, any>, secret = getAdminSecret()): string {
  const header = Buffer.from(JSON.stringify({ alg: "HS256", typ: "JWT" })).toString("base64url");
  const body = Buffer.from(JSON.stringify(payload)).toString("base64url");
  const data = `${header}.${body}`;
  const sig = crypto.createHmac("sha256", secret).update(data).digest("base64url");
  return `${data}.${sig}`;
}

export function verifyToken(token: string, secret = getAdminSecret()): Record<string, any> | null {
  const parts = token.split(".");
  if (parts.length !== 3) return null;
  const [header, body, sig] = parts;
  const data = `${header}.${body}`;
  const expected = crypto.createHmac("sha256", secret).update(data).digest("base64url");
  if (crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(expected))) {
    try {
      return JSON.parse(Buffer.from(body, "base64url").toString("utf8"));
    } catch {
      return null;
    }
  }
  return null;
}



