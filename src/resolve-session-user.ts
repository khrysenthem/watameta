import type { NextAuthRequest } from "next-auth";
import { verifySessionToken } from "./session-token";

const BEARER_PREFIX = "Bearer ";

/**
 * Resolves the authenticated user id for a request, whichever transport it
 * came in on: the web's cookie-based session (populated by the auth()
 * wrapper as request.auth), or a mobile client's Authorization: Bearer
 * <token> header carrying the same kind of session token issued by
 * /api/mobile/auth/google.
 */
export async function resolveSessionUserId(request: NextAuthRequest): Promise<string | null> {
  if (request.auth?.user?.id) {
    return request.auth.user.id;
  }

  const authHeader = request.headers.get("authorization");
  if (authHeader?.startsWith(BEARER_PREFIX)) {
    const payload = await verifySessionToken(authHeader.slice(BEARER_PREFIX.length));
    if (payload) return payload.userId;
  }

  return null;
}
