import { db } from "./database";

export async function upsertUserByEmail(email: string): Promise<{ id: string }> {
  const existingUser = await db.selectFrom("users").select("id").where("email", "=", email).executeTakeFirst();

  return (
    existingUser ??
    (await db.insertInto("users").values({ email }).returning("id").executeTakeFirstOrThrow())
  );
}
