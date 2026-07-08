// Auth.js (NextAuth v5) configuration — single source of truth.
//
// Auth.js expects a single `auth.ts` that exports { handlers, auth, signIn, signOut }.
// The API route (`src/app/api/auth/[...nextauth]/route.ts`) re-exports `handlers`.
// Server code imports `auth` to read the current session; client code uses signIn/signOut.

import NextAuth from "next-auth";
import Google from "next-auth/providers/google";
import { PrismaAdapter } from "@auth/prisma-adapter";

import { prisma } from "@/lib/db";

export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter: PrismaAdapter(prisma),
  session: {
    // JWT sessions: no DB roundtrip per request. Simpler for now; can switch to
    // strategy: "database" later if we need server-side revocation.
    strategy: "jwt",
  },
  providers: [
    Google({
      // AUTH_GOOGLE_ID / AUTH_GOOGLE_SECRET are the Auth.js v5 conventional names,
      // and Auth.js reads them automatically. Kept here explicit for clarity.
      clientId: process.env.AUTH_GOOGLE_ID,
      clientSecret: process.env.AUTH_GOOGLE_SECRET,
    }),
  ],
  pages: {
    signIn: "/signin",
  },
});
