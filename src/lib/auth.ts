// Auth.js (NextAuth v5) configuration.
//
// Providers:
//   - Google (OAuth) — traditional Google sign-in
//   - Credentials (whatsapp) — phone + OTP code sent via wasenderapi
//
// Telegram removed: Telegram bots can't cold-DM users, so sign-in would have
// required a one-time bot-link dance. Not worth the friction; we keep the
// bot around for reminder delivery if a user opts in from Settings later.
//
// JWT-only sessions, 1-year rolling expiry (see maxAge/updateAge below).
// On first sign-in we auto-enable the skill matching the provider:
//   Google → browser_mcp, WhatsApp → reminders.
// We also stash the phone number on UserChannelPref so the reminders
// scheduler knows where to deliver.

import NextAuth from "next-auth";
import Google from "next-auth/providers/google";
import Credentials from "next-auth/providers/credentials";
import { enableSkill } from "./enabled-skills";
import { syntheticEmail, verifySignInCode } from "./otp";
import { prisma } from "./db";

const PROVIDER_AUTO_ENABLE: Record<string, string> = {
  google: "browser_mcp",
  whatsapp: "reminders",
};

export const { handlers, auth, signIn, signOut } = NextAuth({
  // Trust the incoming Host header. Required behind Cloudflare tunnel where
  // the container sees plain HTTP but the browser used HTTPS — without this,
  // NextAuth can't reliably decide cookie prefixes and PKCE breaks.
  trustHost: true,
  session: {
    strategy: "jwt",
    maxAge: 60 * 60 * 24 * 365,
    updateAge: 60 * 60 * 24,
  },
  providers: [
    Google({
      clientId: process.env.AUTH_GOOGLE_ID,
      clientSecret: process.env.AUTH_GOOGLE_SECRET,
    }),
    Credentials({
      id: "whatsapp",
      name: "WhatsApp",
      credentials: {
        identifier: { label: "Phone (E.164)", type: "text" },
        code: { label: "Code", type: "text" },
      },
      async authorize(creds) {
        const phone = String(creds?.identifier ?? "").trim();
        const code = String(creds?.code ?? "").trim();
        if (!phone || !code) return null;
        const ok = await verifySignInCode("whatsapp", phone, code);
        if (!ok) return null;
        const email = syntheticEmail(phone);
        return { id: email, email, name: phone };
      },
    }),
  ],
  events: {
    async signIn({ user, account }) {
      const provider = account?.provider;
      if (!provider || !user.email) return;
      const skillId = PROVIDER_AUTO_ENABLE[provider];
      if (skillId) enableSkill(user.email, skillId).catch(() => undefined);
      if (provider === "whatsapp") {
        const phone = user.email.split("@")[0];
        await prisma.userChannelPref
          .upsert({
            where: { userId: user.email },
            create: { userId: user.email, whatsappNumber: phone, defaultChannel: "whatsapp" },
            update: { whatsappNumber: phone },
          })
          .catch(() => undefined);
      }
    },
  },
  pages: {
    signIn: "/signin",
  },
});
