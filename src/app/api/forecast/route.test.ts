import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
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

async function createUser(email: string) {
  return db.insertInto("users").values({ email }).returning("id").executeTakeFirstOrThrow();
}

describe("GET /api/forecast", () => {
  it("returns 401 when there is no session", async () => {
    const response = await callGet("/api/forecast");
    expect(response.status).toBe(401);
  });

  it("returns a 7x24 grid built only from the requesting user's own readings", async () => {
    const alice = await createUser("alice@example.com");
    const bob = await createUser("bob@example.com");

    await db
      .insertInto("readings")
      .values([
        // Two Mondays for alice at 09:00-10:00, consumption 5 then 7 -> average 6
        { user_id: alice.id, recorded_at: "2023-01-02T09:00:00Z", value: 100 },
        { user_id: alice.id, recorded_at: "2023-01-02T10:00:00Z", value: 105 },
        { user_id: alice.id, recorded_at: "2023-01-09T09:00:00Z", value: 200 },
        { user_id: alice.id, recorded_at: "2023-01-09T10:00:00Z", value: 207 },
        // Bob's readings must never influence alice's forecast
        { user_id: bob.id, recorded_at: "2023-01-02T09:00:00Z", value: 1000 },
        { user_id: bob.id, recorded_at: "2023-01-02T10:00:00Z", value: 1500 },
      ])
      .execute();

    const cookie = await sessionCookie(alice.id, "alice@example.com");
    const response = await callGet("/api/forecast", cookie);
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.forecast).toHaveLength(7);

    const monday = body.forecast.find((d: { dayOfWeek: number }) => d.dayOfWeek === 1);
    expect(monday.hours[10]).toMatchObject({ average: 6, sampleCount: 2 });
    expect(monday.hours[9].average).toBeNull();

    // no bucket anywhere in the grid should reflect bob's much larger consumption
    const allSamples = body.forecast.flatMap((d: { hours: { sampleCount: number }[] }) => d.hours);
    const totalSamples = allSamples.reduce((sum: number, h: { sampleCount: number }) => sum + h.sampleCount, 0);
    expect(totalSamples).toBe(2);
  });
});
