// Auth.js (NextAuth v5) configuration — single source of truth.
//
// Auth.js expects a single `auth.ts` that exports { handlers, auth, signIn, signOut }.
// The API route (`src/app/api/auth/[...nextauth]/route.ts`) re-exports `handlers`.
// Server code imports `auth` to read the current session; client code uses signIn/signOut.
//
// Note: we're running JWT-only for M1 — the session lives in a cookie, not the DB.
// The Prisma adapter is intentionally not wired up yet because Prisma 7 is newer than
// what @auth/prisma-adapter currently supports. When we need to persist conversation
// history (M2), we either downgrade Prisma or wait for the adapter to catch up.

import NextAuth from "next-auth";
import Google from "next-auth/providers/google";

export const { handlers, auth, signIn, signOut } = NextAuth({
  session: { strategy: "jwt" },
  providers: [
    Google({
      clientId: process.env.AUTH_GOOGLE_ID,
      clientSecret: process.env.AUTH_GOOGLE_SECRET,
    }),
  ],
  pages: {
    signIn: "/signin",
  },
});
