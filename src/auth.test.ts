import { afterAll, beforeEach, describe, expect, it, vi } from "vitest";
import type { JWT } from "next-auth/jwt";

const upsertUserByEmailMock = vi.fn();

vi.mock("./db/users", () => ({
  upsertUserByEmail: upsertUserByEmailMock,
}));

const ORIGINAL_ENV = {
  AUTH_GOOGLE_ID: process.env.AUTH_GOOGLE_ID,
  AUTH_GOOGLE_SECRET: process.env.AUTH_GOOGLE_SECRET,
  AUTH_SECRET: process.env.AUTH_SECRET,
};

// auth.ts calls NextAuth(...) at import time, which reads these — harmless
// placeholders are enough since this file only exercises the two exported
// callback functions, never the real OAuth flow.
process.env.AUTH_GOOGLE_ID ??= "test-google-id";
process.env.AUTH_GOOGLE_SECRET ??= "test-google-secret";
process.env.AUTH_SECRET ??= "test-auth-secret";

const { isEmailVerified, withUserId } = await import("./auth");

afterAll(() => {
  Object.assign(process.env, ORIGINAL_ENV);
});

beforeEach(() => {
  upsertUserByEmailMock.mockReset();
});

describe("isEmailVerified", () => {
  it("is true only when the profile's email_verified claim is exactly true", () => {
    expect(isEmailVerified({ email_verified: true })).toBe(true);
    expect(isEmailVerified({ email_verified: false })).toBe(false);
    expect(isEmailVerified({})).toBe(false);
    expect(isEmailVerified(undefined)).toBe(false);
  });
});

describe("withUserId", () => {
  it("upserts the user and stamps userId when the token has none yet", async () => {
    upsertUserByEmailMock.mockResolvedValue({ id: "user-1" });
    const token = { email: "a@example.com" } as JWT;

    const result = await withUserId(token);

    expect(result.userId).toBe("user-1");
    expect(upsertUserByEmailMock).toHaveBeenCalledExactlyOnceWith("a@example.com");
  });

  it("skips the upsert when the token already has a userId", async () => {
    const token = { email: "a@example.com", userId: "user-1" } as JWT;

    const result = await withUserId(token);

    expect(result.userId).toBe("user-1");
    expect(upsertUserByEmailMock).not.toHaveBeenCalled();
  });

  it("returns the token unchanged when there is no email", async () => {
    const token = {} as JWT;

    const result = await withUserId(token);

    expect(result).toBe(token);
    expect(upsertUserByEmailMock).not.toHaveBeenCalled();
  });
});
