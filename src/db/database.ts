import "dotenv/config";
import { Kysely, PostgresDialect } from "kysely";
import { Pool } from "pg";
import type { Database } from "./types";

function createDb(): Kysely<Database> {
  return new Kysely<Database>({
    dialect: new PostgresDialect({
      pool: new Pool({
        connectionString: process.env.DATABASE_URL,
      }),
    }),
  });
}

declare global {
  // eslint-disable-next-line no-var -- required for global augmentation
  var __watametaDb: Kysely<Database> | undefined;
}

// `next dev` hot-reloads this module (and anything that transitively imports
// it) on file changes, which would otherwise create — and leak the
// connections of — a new Pool on every edit. Caching on globalThis survives
// the module re-evaluation; production and tests each get exactly one
// process anyway, so this is dev-only.
export const db =
  process.env.NODE_ENV === "development" ? (globalThis.__watametaDb ??= createDb()) : createDb();
