import * as path from "path";
import { fileURLToPath } from "url";
import { promises as fs } from "fs";
import type { Kysely } from "kysely";
import { FileMigrationProvider, Migrator } from "kysely/migration";
import type { Database } from "./types";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export function createMigrator(db: Kysely<Database>): Migrator {
  return new Migrator({
    db,
    provider: new FileMigrationProvider({
      fs,
      path,
      migrationFolder: path.join(__dirname, "migrations"),
    }),
  });
}
