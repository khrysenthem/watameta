import * as path from "path";
import { fileURLToPath } from "url";
import { readFileSync } from "fs";
import { db } from "./database";
import { parseCsv } from "./csv";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const CSV_PATH = path.join(__dirname, "seed-data", "sample_data_2025-04-10.csv");
const DEMO_USER_EMAIL = "demo@watameta.dev";

async function seed() {
  const existingUser = await db
    .selectFrom("users")
    .select("id")
    .where("email", "=", DEMO_USER_EMAIL)
    .executeTakeFirst();

  const user =
    existingUser ??
    (await db.insertInto("users").values({ email: DEMO_USER_EMAIL }).returning("id").executeTakeFirstOrThrow());

  const readings = parseCsv(readFileSync(CSV_PATH, "utf-8"));

  await db
    .insertInto("readings")
    .values(readings.map((r) => ({ user_id: user.id, recorded_at: r.recordedAt, value: r.value })))
    .onConflict((oc) => oc.columns(["user_id", "recorded_at"]).doNothing())
    .execute();

  console.log(`seeded ${readings.length} readings for ${DEMO_USER_EMAIL}`);

  await db.destroy();
}

seed();
