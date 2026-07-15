// Telegram bot webhook for the Paperloft Assist sign-in bot.
//
// URL: /api/telegram/bot-webhook/<TELEGRAM_WEBHOOK_SECRET>
// Registered via `setWebhook` at deploy time (see scripts / manual).
//
// When a user sends /start to the bot, we reply with their chatId so they
// can paste it into the sign-in UI. That chatId is then used as their
// Telegram "identifier" for OTP delivery.

import { NextResponse } from "next/server";
import { sendTelegramToChatId } from "@/lib/telegram-bot";

export const runtime = "nodejs";

interface TgMessage {
  message_id: number;
  chat: { id: number; type: string };
  from?: { id: number; username?: string; first_name?: string };
  text?: string;
}

interface TgUpdate {
  update_id: number;
  message?: TgMessage;
}

export async function POST(
  req: Request,
  { params }: { params: Promise<{ secret: string }> },
) {
  const { secret } = await params;
  if (secret !== process.env.TELEGRAM_WEBHOOK_SECRET) {
    // Return 200 anyway so Telegram doesn't disable the webhook on bad hits.
    return NextResponse.json({ ok: true });
  }
  const update = (await req.json().catch(() => null)) as TgUpdate | null;
  const msg = update?.message;
  if (!msg?.text) return NextResponse.json({ ok: true });

  const chatId = String(msg.chat.id);
  const text = msg.text.trim();

  if (text.startsWith("/start")) {
    const reply = [
      "Welcome to Paperloft Assist sign-in.",
      "",
      "Your Telegram sign-in id:",
      `<code>${chatId}</code>`,
      "",
      "Copy that id and paste it into the Paperloft Assist sign-in page. We'll send you a one-time code here to finish.",
    ].join("\n");
    await sendTelegramToChatId(chatId, reply).catch(() => undefined);
  }

  return NextResponse.json({ ok: true });
}
