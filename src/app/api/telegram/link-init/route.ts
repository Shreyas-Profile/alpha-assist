// POST /api/telegram/link-init
//
// Signed-in user hits this to start a Telegram link. We mint a random nonce,
// store it against their email with a 10-min TTL, and return a deep-link URL:
//
//   https://t.me/PaperloftAssistantBot?start=<nonce>
//
// The user clicks that, Telegram opens the bot with `/start <nonce>` as the
// first message, and the bot webhook consumes the nonce to link chat_id →
// userEmail. Nonce is the trust bridge — issued only to authenticated users,
// bound to their email, single-use.

import { NextResponse } from "next/server";
import { randomBytes } from "node:crypto";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";

const NONCE_TTL_MS = 10 * 60 * 1000;
const BOT_USERNAME = process.env.TELEGRAM_BOT_USERNAME ?? "PaperloftAssistantBot";

export async function POST() {
  const session = await auth();
  if (!session?.user?.email) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const nonce = randomBytes(16).toString("hex");
  await prisma.telegramLinkNonce.create({
    data: {
      nonce,
      userEmail: session.user.email,
      expiresAt: new Date(Date.now() + NONCE_TTL_MS),
    },
  });
  return NextResponse.json({
    ok: true,
    deepLink: `https://t.me/${BOT_USERNAME}?start=${nonce}`,
  });
}

export async function DELETE() {
  const session = await auth();
  if (!session?.user?.email) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  await prisma.telegramLink.delete({ where: { userEmail: session.user.email } }).catch(() => undefined);
  return NextResponse.json({ ok: true });
}
