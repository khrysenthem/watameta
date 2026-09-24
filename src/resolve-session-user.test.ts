import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { NextRequest } from "next/server";
import type { NextAuthRequest } from "next-auth";
import { resolveSessionUserId } from "./resolve-session-user";
import { issueSessionToken } from "./session-token";

const ORIGINAL_SECRET = process.env.AUTH_SECRET;

beforeEach(() => {
  process.env.AUTH_SECRET = "test-secret-for-resolve-session-user";
});

afterEach(() => {
  process.env.AUTH_SECRET = ORIGINAL_SECRET;
});

function requestWithAuth(
  auth: NextAuthRequest["auth"],
  headers?: Record<string, string>,
): NextAuthRequest {
  const request = new NextRequest("http://localhost:3000/api/today", { headers }) as NextAuthRequest;
  request.auth = auth;
  return request;
}

describe("resolveSessionUserId", () => {
  it("prefers the cookie-based session (request.auth) when present", async () => {
    const request = requestWithAuth({
      user: { id: "user-1", email: "a@example.com" },
      expires: "",
    });

    expect(await resolveSessionUserId(request)).toBe("user-1");
  });

  it("falls back to a Bearer token when there is no cookie session", async () => {
    const token = await issueSessionToken({ userId: "user-2", email: "b@example.com" });
    const request = requestWithAuth(null, { authorization: `Bearer ${token}` });

    expect(await resolveSessionUserId(request)).toBe("user-2");
  });

  it("returns null when neither a cookie session nor a Bearer token is present", async () => {
    const request = requestWithAuth(null);
    expect(await resolveSessionUserId(request)).toBeNull();
  });

  it("returns null for an invalid Bearer token", async () => {
    const request = requestWithAuth(null, { authorization: "Bearer garbage" });
    expect(await resolveSessionUserId(request)).toBeNull();
  });

  it("ignores a non-Bearer authorization header", async () => {
    const request = requestWithAuth(null, { authorization: "Basic abc123" });
    expect(await resolveSessionUserId(request)).toBeNull();
  });
});
