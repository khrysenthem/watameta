import NextAuth from "next-auth";
import Google from "next-auth/providers/google";
import { db } from "./db/database";

export const { handlers, auth, signIn, signOut } = NextAuth({
  providers: [Google],
  session: { strategy: "jwt" },
  callbacks: {
    async jwt({ token }) {
      if (!token.email) return token;

      const existingUser = await db
        .selectFrom("users")
        .select("id")
        .where("email", "=", token.email)
        .executeTakeFirst();

      const user =
        existingUser ??
        (await db.insertInto("users").values({ email: token.email }).returning("id").executeTakeFirstOrThrow());

      token.userId = user.id;
      return token;
    },
    async session({ session, token }) {
      if (token.userId) {
        session.user.id = token.userId;
      }
      return session;
    },
  },
});
