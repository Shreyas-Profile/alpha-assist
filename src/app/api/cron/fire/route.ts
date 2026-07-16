// POST /api/cron/fire — receives job-fire webhooks from cron-mcp.
//
// cron-mcp POSTs { jobId, name, prompt, metadata, firedAt } here whenever
// one of our users' scheduled jobs is due. metadata.userEmail identifies
// whose job it is. We run the prompt through the LLM + full tool set (same
// pipeline as the Telegram bot) and deliver the result to the user's
// Telegram chat.
//
// Auth: HMAC-SHA256 signature of the raw body via CRON_WEBHOOK_SIGNING_SECRET,
// sent as X-Cron-Signature by cron-mcp's scheduler. Constant-time compare.

import { NextResponse } from "next/server";
import { createHmac, timingSafeEqual } from "node:crypto";
import { prisma } from "@/lib/db";
import { handleTelegramMessage } from "@/lib/telegram-chat";
import { sendTelegramToChatId } from "@/lib/telegram-bot";

export const runtime = "nodejs";
export const maxDuration = 60;

interface FirePayload {
  jobId: string;
  name: string;
  prompt: string;
  metadata?: { userEmail?: string } | null;
  firedAt: string;
}

function verifySignature(body: string, headerSig: string | null): boolean {
  const secret = process.env.CRON_WEBHOOK_SIGNING_SECRET;
  if (!secret) return false;
  if (!headerSig) return false;
  const expected = createHmac("sha256", secret).update(body).digest("hex");
  const a = Buffer.from(expected, "hex");
  const b = Buffer.from(headerSig, "hex");
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}

export async function POST(req: Request) {
  const raw = await req.text();
  const sig = req.headers.get("x-cron-signature");
  if (!verifySignature(raw, sig)) {
    // 200 with error body, so cron-mcp doesn't treat this as a network
    // failure and retry (which would just fail auth again). But log it.
    console.warn("[cron/fire] bad signature; ignoring");
    return NextResponse.json({ ok: false, error: "bad signature" }, { status: 401 });
  }

  const payload = JSON.parse(raw) as FirePayload;
  const email = payload.metadata?.userEmail;
  if (!email) {
    console.warn(`[cron/fire] job ${payload.jobId} has no metadata.userEmail; skipping`);
    return NextResponse.json({ ok: false, error: "no userEmail in metadata" }, { status: 200 });
  }

  const link = await prisma.telegramLink.findUnique({ where: { userEmail: email } });
  if (!link) {
    console.warn(`[cron/fire] no telegram link for ${email}; can't deliver`);
    return NextResponse.json({ ok: false, error: "no telegram link" }, { status: 200 });
  }

  // Run the prompt through the same pipeline the bot uses on inbound
  // messages — reuses tools, model config, anti-fabrication prompt, etc.
  // Fire-and-forget: return 200 immediately so cron-mcp doesn't wait.
  handleTelegramMessage(link.chatId, `[Scheduled — ${payload.name}]\n\n${payload.prompt}`)
    .then((reply) =>
      sendTelegramToChatId(
        link.chatId,
        `⏰ *${payload.name}*\n\n${reply}`,
      ),
    )
    .catch((err) => {
      console.error(`[cron/fire] handler for ${email} threw:`, err);
      return sendTelegramToChatId(
        link.chatId,
        `⏰ *${payload.name}*\n\nScheduled job failed: ${(err as Error).message}`,
      ).catch(() => undefined);
    });

  return NextResponse.json({ ok: true });
}
