import { db } from "./database";

/**
 * A single atomic upsert rather than SELECT-then-INSERT: `email` is UNIQUE,
 * so two concurrent calls for the same brand-new email would otherwise both
 * miss the SELECT and race on INSERT, and the loser would throw a
 * unique-violation instead of just returning the row the winner created.
 * `DO UPDATE SET email = <the same email>` is a no-op write (it can't differ,
 * since it's also the conflict target) — it exists only so `RETURNING id`
 * has a row to return on a conflict, which `DO NOTHING` wouldn't provide.
 */
export async function upsertUserByEmail(email: string): Promise<{ id: string }> {
  return db
    .insertInto("users")
    .values({ email })
    .onConflict((oc) => oc.column("email").doUpdateSet({ email }))
    .returning("id")
    .executeTakeFirstOrThrow();
}
