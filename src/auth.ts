import NextAuth from "next-auth";
import Google from "next-auth/providers/google";
import { upsertUserByEmail } from "./db/users";

export const { handlers, auth, signIn, signOut } = NextAuth({
  providers: [Google],
  session: { strategy: "jwt" },
  callbacks: {
    async jwt({ token }) {
      if (!token.email) return token;

      const user = await upsertUserByEmail(token.email);
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
