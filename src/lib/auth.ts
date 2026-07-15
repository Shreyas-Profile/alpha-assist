// Auth.js (NextAuth v5) configuration.
//
// JWT-only sessions (no adapter). On first sign-in, we auto-enable the skill
// that matches the provider — Google → browser_mcp, Telegram → telegram_mcp,
// WhatsApp → reminders. The user can toggle skills freely from /skills afterwards.

import NextAuth from "next-auth";
import Google from "next-auth/providers/google";
import { enableSkill } from "./enabled-skills";

// Map provider IDs to the skill they should auto-enable on first sign-in.
// This is the "sign in with X" → "X skill enabled" onboarding rule.
const PROVIDER_AUTO_ENABLE: Record<string, string> = {
  google: "browser_mcp",
  telegram: "telegram_mcp",
  whatsapp: "reminders",
};

export const { handlers, auth, signIn, signOut } = NextAuth({
  session: { strategy: "jwt" },
  providers: [
    Google({
      clientId: process.env.AUTH_GOOGLE_ID,
      clientSecret: process.env.AUTH_GOOGLE_SECRET,
    }),
    // TODO: add Telegram Login Widget provider once BotFather bot is set up.
    // TODO: add WhatsApp OTP provider once wasenderapi key is provisioned.
  ],
  events: {
    async signIn({ user, account }) {
      // Fire-and-forget auto-enable of the matching skill.
      const skillId = account?.provider ? PROVIDER_AUTO_ENABLE[account.provider] : undefined;
      if (skillId && user.email) {
        enableSkill(user.email, skillId).catch(() => undefined);
      }
    },
  },
  pages: {
    signIn: "/signin",
  },
});
