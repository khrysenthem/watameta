import { PostgreSqlContainer, type StartedPostgreSqlContainer } from "@testcontainers/postgresql";
import type { Kysely } from "kysely";
import type { Database } from "@/db/types";

export const TEST_AUTH_SECRET = "vitest-only-secret-do-not-use-elsewhere";

export interface TestDatabase {
  container: StartedPostgreSqlContainer;
  db: Kysely<Database>;
}

/**
 * Starts an ephemeral Postgres container, points DATABASE_URL/AUTH_* at it,
 * and runs migrations. Must run before dynamically importing anything that
 * transitively imports "@/db/database" or "@/auth", since those read
 * process.env at module-load time.
 */
export async function startTestDatabase(): Promise<TestDatabase> {
  const container = await new PostgreSqlContainer("postgres:17-alpine").start();

  process.env.DATABASE_URL = container.getConnectionUri();
  process.env.AUTH_SECRET = TEST_AUTH_SECRET;
  process.env.AUTH_GOOGLE_ID = "test-google-id";
  process.env.AUTH_GOOGLE_SECRET = "test-google-secret";

  const { db } = await import("@/db/database");
  const { createMigrator } = await import("@/db/migrator");
  const { error } = await createMigrator(db).migrateToLatest();
  if (error) throw error;

  return { container, db };
}

export async function stopTestDatabase({ container, db }: TestDatabase): Promise<void> {
  await db.destroy();
  await container.stop();
}
