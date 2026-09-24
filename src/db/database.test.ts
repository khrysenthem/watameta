import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// pg's Pool connects lazily (on first query), so constructing several of
// them here — as each module reload does — never opens a real socket.
beforeEach(() => {
  vi.stubEnv("DATABASE_URL", "postgres://test:test@localhost:5432/testdb");
  globalThis.__watametaDb = undefined;
});

afterEach(() => {
  vi.unstubAllEnvs();
  globalThis.__watametaDb = undefined;
  vi.resetModules();
});

describe("db", () => {
  it("reuses the same instance across module reloads in development", async () => {
    vi.stubEnv("NODE_ENV", "development");

    const first = await import("./database");
    vi.resetModules();
    const second = await import("./database");

    expect(second.db).toBe(first.db);
  });

  it("creates a fresh instance per module load outside development", async () => {
    vi.stubEnv("NODE_ENV", "test");

    const first = await import("./database");
    vi.resetModules();
    const second = await import("./database");

    expect(second.db).not.toBe(first.db);
  });
});
