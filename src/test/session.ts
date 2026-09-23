import { NextRequest } from "next/server";
import { encode } from "@auth/core/jwt";
import { TEST_AUTH_SECRET } from "./testDatabase";

export async function sessionCookie(userId: string, email: string): Promise<string> {
  const token = await encode({
    secret: TEST_AUTH_SECRET,
    salt: "authjs.session-token",
    token: { sub: userId, userId, email },
  });
  return `authjs.session-token=${token}`;
}

export function requestFor(path: string, cookie?: string): NextRequest {
  // Auth.js's `auth()` route wrapper builds its internal session-check URL from
  // x-forwarded-proto/host, which Next.js's server injects on every real request.
  // A NextRequest built by hand needs these set explicitly or auth() silently
  // treats the request as unauthenticated.
  const headers: Record<string, string> = {
    "x-forwarded-proto": "http",
    "x-forwarded-host": "localhost:3000",
    host: "localhost:3000",
  };
  if (cookie) headers.cookie = cookie;

  return new NextRequest(new URL(path, "http://localhost:3000"), { headers });
}
