import NextAuth from "next-auth";
import Google from "next-auth/providers/google";
import type { Profile } from "next-auth";
import type { JWT } from "next-auth/jwt";
import { upsertUserByEmail } from "./db/users";

// Auth.js doesn't check this for you (see @auth/core's Google provider docs)
// — without it, any email Google returns is trusted outright, even one the
// account hasn't actually verified.
export function isEmailVerified(profile?: Profile): boolean {
  return profile?.email_verified === true;
}

// With the JWT session strategy this callback runs on every request that
// touches auth() (every route handler), not just at sign-in — once userId is
// set it never needs to change, so skip re-querying.
export async function withUserId(token: JWT): Promise<JWT> {
  if (!token.email || token.userId) return token;

  const user = await upsertUserByEmail(token.email);
  token.userId = user.id;
  return token;
}

export const { handlers, auth, signIn, signOut } = NextAuth({
  providers: [Google],
  session: { strategy: "jwt" },
  callbacks: {
    async signIn({ profile }) {
      return isEmailVerified(profile);
    },
    async jwt({ token }) {
      return withUserId(token);
    },
    async session({ session, token }) {
      if (token.userId) {
        session.user.id = token.userId;
      }
      return session;
    },
  },
});
