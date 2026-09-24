import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import type { Kysely } from "kysely";
import type { Database } from "@/db/types";
import { startTestDatabase, stopTestDatabase, type TestDatabase } from "@/test/testDatabase";
import { verifySessionToken } from "@/session-token";

const verifyIdTokenMock = vi.fn();

vi.mock("google-auth-library", () => ({
  OAuth2Client: class {
    verifyIdToken = verifyIdTokenMock;
  },
}));

let testDb: TestDatabase;
let db: Kysely<Database>;
let POST: typeof import("./route").POST;

function postRequest(body: unknown): Request {
  return new Request("http://localhost:3000/api/mobile/auth/google", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

beforeAll(async () => {
  testDb = await startTestDatabase();
  db = testDb.db;
  process.env.AUTH_GOOGLE_MOBILE_CLIENT_ID = "test-google-mobile-client-id";

  ({ POST } = await import("./route"));
}, 60_000);

afterAll(async () => {
  await stopTestDatabase(testDb);
});

beforeEach(async () => {
  await db.deleteFrom("readings").execute();
  await db.deleteFrom("users").execute();
  verifyIdTokenMock.mockReset();
});

describe("POST /api/mobile/auth/google", () => {
  it("verifies a valid ID token, issues a session token, and upserts the user", async () => {
    verifyIdTokenMock.mockResolvedValue({
      getPayload: () => ({ email: "alice@example.com", email_verified: true }),
    });

    const response = await POST(postRequest({ idToken: "fake-google-id-token" }));
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.user.email).toBe("alice@example.com");
    expect(typeof body.token).toBe("string");

    const payload = await verifySessionToken(body.token);
    expect(payload?.userId).toBe(body.user.id);

    const row = await db
      .selectFrom("users")
      .select("id")
      .where("email", "=", "alice@example.com")
      .executeTakeFirst();
    expect(row?.id).toBe(body.user.id);
  });

  it("reuses the existing user row on a second sign-in", async () => {
    verifyIdTokenMock.mockResolvedValue({
      getPayload: () => ({ email: "alice@example.com", email_verified: true }),
    });

    const first = await (await POST(postRequest({ idToken: "fake-google-id-token-1" }))).json();
    const second = await (await POST(postRequest({ idToken: "fake-google-id-token-2" }))).json();

    expect(second.user.id).toBe(first.user.id);
    const count = await db.selectFrom("users").select((eb) => eb.fn.countAll().as("count")).executeTakeFirst();
    expect(Number(count?.count)).toBe(1);
  });

  it("returns 400 when idToken is missing", async () => {
    const response = await POST(postRequest({}));
    expect(response.status).toBe(400);
  });

  it("returns 401 when Google rejects the ID token", async () => {
    verifyIdTokenMock.mockRejectedValue(new Error("invalid token"));

    const response = await POST(postRequest({ idToken: "bad-id-token" }));
    expect(response.status).toBe(401);
  });

  it("returns 401 when the ID token has no email", async () => {
    verifyIdTokenMock.mockResolvedValue({ getPayload: () => ({}) });

    const response = await POST(postRequest({ idToken: "fake-google-id-token" }));
    expect(response.status).toBe(401);
  });

  it("returns 401 when the Google account's email is not verified", async () => {
    verifyIdTokenMock.mockResolvedValue({
      getPayload: () => ({ email: "alice@example.com", email_verified: false }),
    });

    const response = await POST(postRequest({ idToken: "fake-google-id-token" }));
    expect(response.status).toBe(401);

    const row = await db
      .selectFrom("users")
      .select("id")
      .where("email", "=", "alice@example.com")
      .executeTakeFirst();
    expect(row).toBeUndefined();
  });

  it("returns 500 when AUTH_GOOGLE_MOBILE_CLIENT_ID is not configured", async () => {
    const original = process.env.AUTH_GOOGLE_MOBILE_CLIENT_ID;
    delete process.env.AUTH_GOOGLE_MOBILE_CLIENT_ID;

    try {
      const response = await POST(postRequest({ idToken: "fake-google-id-token" }));
      expect(response.status).toBe(500);
    } finally {
      process.env.AUTH_GOOGLE_MOBILE_CLIENT_ID = original;
    }
  });
});
