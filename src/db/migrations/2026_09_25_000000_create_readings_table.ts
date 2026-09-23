import { Kysely } from "kysely";

export async function up(db: Kysely<any>): Promise<void> {
  await db.schema
    .createTable("readings")
    .addColumn("user_id", "uuid", (col) => col.notNull().references("users.id").onDelete("cascade"))
    .addColumn("recorded_at", "timestamptz", (col) => col.notNull())
    .addColumn("value", "integer", (col) => col.notNull())
    .addPrimaryKeyConstraint("readings_pkey", ["user_id", "recorded_at"])
    .execute();
}

export async function down(db: Kysely<any>): Promise<void> {
  await db.schema.dropTable("readings").execute();
}
