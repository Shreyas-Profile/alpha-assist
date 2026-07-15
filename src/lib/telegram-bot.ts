// Wrapper around the Telegram Bot API for the sign-in bot.
//
// We use @shreyasassistantbot (the same one Shreyas used to test telegram-mcp).
// Env: TELEGRAM_BOT_TOKEN (the BotFather token).
//
// Two entry points:
//   - sendTelegramToChatId(chatId, text) — outbound DM (used for OTP codes)
//   - handleUpdate(update) — inbound /start etc. (called from the webhook route)

const API = "https://api.telegram.org/bot";

export interface TgSendResult {
  ok: boolean;
  reason?: string;
}

export async function sendTelegramToChatId(
  chatId: string,
  text: string,
): Promise<TgSendResult> {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  if (!token) {
    console.warn("[telegram-bot] TELEGRAM_BOT_TOKEN not set — cannot send");
    return { ok: false, reason: "TELEGRAM_BOT_TOKEN not configured on server" };
  }
  const res = await fetch(`${API}${token}/sendMessage`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ chat_id: chatId, text }),
  });
  const json = (await res.json().catch(() => ({}))) as {
    ok?: boolean;
    description?: string;
  };
  if (!json.ok) return { ok: false, reason: json.description ?? `HTTP ${res.status}` };
  return { ok: true };
}

export async function setWebhook(url: string): Promise<TgSendResult> {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  if (!token) return { ok: false, reason: "TELEGRAM_BOT_TOKEN not set" };
  const res = await fetch(`${API}${token}/setWebhook`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ url, allowed_updates: ["message"] }),
  });
  const json = (await res.json().catch(() => ({}))) as {
    ok?: boolean;
    description?: string;
  };
  if (!json.ok) return { ok: false, reason: json.description ?? `HTTP ${res.status}` };
  return { ok: true };
}
