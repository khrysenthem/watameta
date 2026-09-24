import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import type { Kysely } from "kysely";
import type { Database } from "./types";
import { startTestDatabase, stopTestDatabase, type TestDatabase } from "@/test/testDatabase";

let testDb: TestDatabase;
let db: Kysely<Database>;
let upsertUserByEmail: typeof import("./users").upsertUserByEmail;

beforeAll(async () => {
  testDb = await startTestDatabase();
  db = testDb.db;

  ({ upsertUserByEmail } = await import("./users"));
}, 60_000);

afterAll(async () => {
  await stopTestDatabase(testDb);
});

beforeEach(async () => {
  await db.deleteFrom("readings").execute();
  await db.deleteFrom("users").execute();
});

describe("upsertUserByEmail", () => {
  it("creates a new user for a brand-new email", async () => {
    const user = await upsertUserByEmail("new@example.com");

    const row = await db.selectFrom("users").select("id").where("email", "=", "new@example.com").executeTakeFirst();
    expect(row?.id).toBe(user.id);
  });

  it("returns the existing user's id on a second call for the same email", async () => {
    const first = await upsertUserByEmail("repeat@example.com");
    const second = await upsertUserByEmail("repeat@example.com");

    expect(second.id).toBe(first.id);
    const count = await db.selectFrom("users").select((eb) => eb.fn.countAll().as("count")).executeTakeFirst();
    expect(Number(count?.count)).toBe(1);
  });

  it("resolves to the same user id when called concurrently for the same brand-new email", async () => {
    // Regression test: a prior SELECT-then-INSERT implementation raced here —
    // both calls could miss the SELECT and one would throw a unique-violation
    // on INSERT instead of both resolving cleanly.
    const [a, b] = await Promise.all([
      upsertUserByEmail("concurrent@example.com"),
      upsertUserByEmail("concurrent@example.com"),
    ]);

    expect(a.id).toBe(b.id);
    const count = await db
      .selectFrom("users")
      .select((eb) => eb.fn.countAll().as("count"))
      .where("email", "=", "concurrent@example.com")
      .executeTakeFirst();
    expect(Number(count?.count)).toBe(1);
  });
});
