import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import type { Kysely } from "kysely";
import type { Database } from "@/db/types";
import { startTestDatabase, stopTestDatabase, type TestDatabase } from "@/test/testDatabase";
import { requestFor, sessionCookie } from "@/test/session";

let testDb: TestDatabase;
let db: Kysely<Database>;
let GET: typeof import("./route").GET;

async function callGet(path: string, cookie?: string): Promise<Response> {
  const response = await GET(requestFor(path, cookie), { params: Promise.resolve({}) });
  if (!response) throw new Error("Expected a Response, got void");
  return response;
}

beforeAll(async () => {
  testDb = await startTestDatabase();
  db = testDb.db;

  ({ GET } = await import("./route"));
}, 60_000);

afterAll(async () => {
  await stopTestDatabase(testDb);
});

beforeEach(async () => {
  await db.deleteFrom("readings").execute();
  await db.deleteFrom("users").execute();
});

afterEach(() => {
  vi.useRealTimers();
});

async function createUser(email: string) {
  return db.insertInto("users").values({ email }).returning("id").executeTakeFirstOrThrow();
}

describe("GET /api/today", () => {
  it("returns 401 when there is no session", async () => {
    const response = await callGet("/api/today");
    expect(response.status).toBe(401);
  });

  it("blends actual readings with a forecast projection, scoped to the requesting user", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2023-01-16T10:30:00Z")); // Monday, mid-hour-10

    const alice = await createUser("alice@example.com");
    const bob = await createUser("bob@example.com");

    await db
      .insertInto("readings")
      .values([
        // Two prior Mondays establish a forecast for hour 11 (+5) and hour 12 (+3)
        { user_id: alice.id, recorded_at: "2023-01-02T10:00:00Z", value: 100 },
        { user_id: alice.id, recorded_at: "2023-01-02T11:00:00Z", value: 105 },
        { user_id: alice.id, recorded_at: "2023-01-02T12:00:00Z", value: 108 },
        { user_id: alice.id, recorded_at: "2023-01-09T10:00:00Z", value: 200 },
        { user_id: alice.id, recorded_at: "2023-01-09T11:00:00Z", value: 205 },
        { user_id: alice.id, recorded_at: "2023-01-09T12:00:00Z", value: 208 },
        // Today's actual readings so far
        { user_id: alice.id, recorded_at: "2023-01-16T09:00:00Z", value: 300 },
        { user_id: alice.id, recorded_at: "2023-01-16T10:00:00Z", value: 300 },
        // Bob's data must never leak into alice's response
        { user_id: bob.id, recorded_at: "2023-01-16T10:00:00Z", value: 999999 },
      ])
      .execute();

    const cookie = await sessionCookie(alice.id, "alice@example.com");
    const response = await callGet("/api/today", cookie);
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.date).toBe("2023-01-16");
    expect(body.hours).toHaveLength(24);

    expect(body.hours[9]).toMatchObject({ value: 300, source: "actual" });
    expect(body.hours[10]).toMatchObject({ value: 300, source: "actual" });
    expect(body.hours[11]).toMatchObject({ value: 305, source: "forecast" }); // 300 + avg(5,5)
    expect(body.hours[12]).toMatchObject({ value: 308, source: "forecast" }); // 305 + avg(3,3)

    // hour 8 has no actual reading and precedes the last known reading -> genuinely unknown
    expect(body.hours[8]).toMatchObject({ value: null, source: null });

    expect(body.hours.some((h: { value: number }) => h.value === 999999)).toBe(false);
  });
});
