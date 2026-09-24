import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { issueSessionToken, verifySessionToken } from "./session-token";

const ORIGINAL_SECRET = process.env.AUTH_SECRET;

beforeEach(() => {
  process.env.AUTH_SECRET = "test-secret-for-session-token-unit-tests";
});

afterEach(() => {
  process.env.AUTH_SECRET = ORIGINAL_SECRET;
});

describe("issueSessionToken / verifySessionToken", () => {
  it("round-trips a payload", async () => {
    const token = await issueSessionToken({ userId: "user-1", email: "alice@example.com" });
    const payload = await verifySessionToken(token);

    expect(payload).toEqual({ userId: "user-1", email: "alice@example.com" });
  });

  it("rejects a token signed with a different secret", async () => {
    const token = await issueSessionToken({ userId: "user-1", email: "alice@example.com" });

    process.env.AUTH_SECRET = "a-completely-different-secret";
    const payload = await verifySessionToken(token);

    expect(payload).toBeNull();
  });

  it("rejects garbage input", async () => {
    const payload = await verifySessionToken("not-a-real-token");
    expect(payload).toBeNull();
  });

  it("throws when issuing without AUTH_SECRET configured", async () => {
    delete process.env.AUTH_SECRET;
    await expect(issueSessionToken({ userId: "user-1", email: "a@b.com" })).rejects.toThrow(
      "AUTH_SECRET is not set",
    );
  });

  it("returns null when verifying without AUTH_SECRET configured", async () => {
    const token = await issueSessionToken({ userId: "user-1", email: "alice@example.com" });
    delete process.env.AUTH_SECRET;

    expect(await verifySessionToken(token)).toBeNull();
  });
});
