import { decode, encode } from "@auth/core/jwt";

// Same salt Auth.js itself uses to derive the encryption key for the
// "authjs.session-token" cookie (see options.cookies.sessionToken.name in
// @auth/core). Using it here means a token issued for mobile is byte-for-byte
// interchangeable with a web session token — the same secret decodes both.
const SALT = "authjs.session-token";

export interface SessionTokenPayload {
  userId: string;
  email: string;
}

export async function issueSessionToken(payload: SessionTokenPayload): Promise<string> {
  const secret = process.env.AUTH_SECRET;
  if (!secret) throw new Error("AUTH_SECRET is not set");

  return encode({
    secret,
    salt: SALT,
    token: { sub: payload.userId, userId: payload.userId, email: payload.email },
  });
}

export async function verifySessionToken(token: string): Promise<SessionTokenPayload | null> {
  const secret = process.env.AUTH_SECRET;
  if (!secret) return null;

  try {
    const decoded = await decode({ secret, salt: SALT, token });
    if (!decoded || typeof decoded.userId !== "string" || typeof decoded.email !== "string") {
      return null;
    }
    return { userId: decoded.userId, email: decoded.email };
  } catch {
    return null;
  }
}
