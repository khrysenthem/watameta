import { NextRequest } from "next/server";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { PostgreSqlContainer, type StartedPostgreSqlContainer } from "@testcontainers/postgresql";
import { encode } from "@auth/core/jwt";
import type { Kysely } from "kysely";
import type { Database } from "@/db/types";

const SESSION_SECRET = "vitest-only-secret-do-not-use-elsewhere";

let container: StartedPostgreSqlContainer;
let db: Kysely<Database>;
let GET: typeof import("./route").GET;

async function sessionCookie(userId: string, email: string) {
  const token = await encode({
    secret: SESSION_SECRET,
    salt: "authjs.session-token",
    token: { sub: userId, userId, email },
  });
  return `authjs.session-token=${token}`;
}

function requestFor(path: string, cookie?: string) {
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

async function callGet(path: string, cookie?: string): Promise<Response> {
  const response = await GET(requestFor(path, cookie), { params: Promise.resolve({}) });
  if (!response) throw new Error("Expected a Response, got void");
  return response;
}

beforeAll(async () => {
  container = await new PostgreSqlContainer("postgres:17-alpine").start();

  process.env.DATABASE_URL = container.getConnectionUri();
  process.env.AUTH_SECRET = SESSION_SECRET;
  process.env.AUTH_GOOGLE_ID = "test-google-id";
  process.env.AUTH_GOOGLE_SECRET = "test-google-secret";

  ({ db } = await import("@/db/database"));
  const { createMigrator } = await import("@/db/migrator");
  const { error } = await createMigrator(db).migrateToLatest();
  if (error) throw error;

  ({ GET } = await import("./route"));
}, 60_000);

afterAll(async () => {
  await db.destroy();
  await container.stop();
});

beforeEach(async () => {
  await db.deleteFrom("readings").execute();
  await db.deleteFrom("users").execute();
});

async function createUser(email: string) {
  return db.insertInto("users").values({ email }).returning("id").executeTakeFirstOrThrow();
}

describe("GET /api/readings", () => {
  it("returns 401 when there is no session", async () => {
    const response = await callGet("/api/readings");
    expect(response.status).toBe(401);
  });

  it("only returns the requesting user's own readings", async () => {
    const alice = await createUser("alice@example.com");
    const bob = await createUser("bob@example.com");

    await db
      .insertInto("readings")
      .values([
        { user_id: alice.id, recorded_at: "2023-01-01T00:00:00Z", value: 1 },
        { user_id: alice.id, recorded_at: "2023-01-01T01:00:00Z", value: 2 },
        { user_id: bob.id, recorded_at: "2023-01-01T00:00:00Z", value: 999 },
      ])
      .execute();

    const cookie = await sessionCookie(alice.id, "alice@example.com");
    const response = await callGet("/api/readings", cookie);
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.data).toHaveLength(2);
    expect(body.data.every((r: { value: number }) => r.value !== 999)).toBe(true);
  });

  it("filters by from/to date range", async () => {
    const alice = await createUser("alice@example.com");

    await db
      .insertInto("readings")
      .values([
        { user_id: alice.id, recorded_at: "2023-01-01T00:00:00Z", value: 1 },
        { user_id: alice.id, recorded_at: "2023-01-02T00:00:00Z", value: 2 },
        { user_id: alice.id, recorded_at: "2023-01-03T00:00:00Z", value: 3 },
      ])
      .execute();

    const cookie = await sessionCookie(alice.id, "alice@example.com");
    const response = await callGet(
      "/api/readings?from=2023-01-02T00:00:00Z&to=2023-01-02T23:59:59Z",
      cookie,
    );
    const body = await response.json();

    expect(body.data).toHaveLength(1);
    expect(body.data[0].value).toBe(2);
  });

  it("returns 400 for an invalid date", async () => {
    const alice = await createUser("alice@example.com");
    const cookie = await sessionCookie(alice.id, "alice@example.com");

    const response = await callGet("/api/readings?from=not-a-date", cookie);
    expect(response.status).toBe(400);
  });

  it("returns 400 for an invalid page", async () => {
    const alice = await createUser("alice@example.com");
    const cookie = await sessionCookie(alice.id, "alice@example.com");

    const response = await callGet("/api/readings?page=0", cookie);
    expect(response.status).toBe(400);
  });

  it("paginates at 24*7 readings per page, ordered newest first", async () => {
    const alice = await createUser("alice@example.com");
    const pageSize = 24 * 7;
    const total = pageSize * 2 + 10;

    const rows = Array.from({ length: total }, (_, i) => ({
      user_id: alice.id,
      recorded_at: new Date(Date.UTC(2023, 0, 1, i)).toISOString(),
      value: i,
    }));
    for (let i = 0; i < rows.length; i += 500) {
      await db.insertInto("readings").values(rows.slice(i, i + 500)).execute();
    }

    const cookie = await sessionCookie(alice.id, "alice@example.com");

    const page1 = await (await callGet("/api/readings?page=1", cookie)).json();
    const page2 = await (await callGet("/api/readings?page=2", cookie)).json();
    const page3 = await (await callGet("/api/readings?page=3", cookie)).json();

    expect(page1.data).toHaveLength(pageSize);
    expect(page2.data).toHaveLength(pageSize);
    expect(page3.data).toHaveLength(10);
    expect(page1.pagination).toEqual({ page: 1, pageSize, total, totalPages: 3 });

    // newest first, and pages are contiguous with no gaps/overlaps
    expect(page1.data[0].value).toBe(total - 1);
    expect(page1.data[pageSize - 1].value).toBe(total - pageSize);
    expect(page2.data[0].value).toBe(total - pageSize - 1);
  });
});
