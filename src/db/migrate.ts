import * as path from "path";
import { fileURLToPath } from "url";
import { promises as fs } from "fs";
import { FileMigrationProvider, Migrator } from "kysely/migration";
import { db } from "./database";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const migrator = new Migrator({
  db,
  provider: new FileMigrationProvider({
    fs,
    path,
    migrationFolder: path.join(__dirname, "migrations"),
  }),
});

async function migrate() {
  const direction = process.argv[2] ?? "latest";

  const { error, results } =
    direction === "down" ? await migrator.migrateDown() : await migrator.migrateToLatest();

  results?.forEach((it: { status: string; migrationName: string }) => {
    if (it.status === "Success") {
      console.log(`migration "${it.migrationName}" was executed successfully`);
    } else if (it.status === "Error") {
      console.error(`failed to execute migration "${it.migrationName}"`);
    }
  });

  if (error) {
    console.error("failed to migrate");
    console.error(error);
    process.exit(1);
  }

  await db.destroy();
}

migrate();
