// OTP generation + delivery for WhatsApp / Telegram sign-in.
//
// 6-digit numeric codes. 10-minute TTL. Single-use.
// WhatsApp delivery = wasenderapi. Telegram delivery = the shared assistant
// bot (@shreyasassistantbot) via Telegram Bot API.

import { randomInt } from "node:crypto";
import { prisma } from "./db";
import { sendWhatsApp } from "./wasender";
import { sendTelegramToChatId } from "./telegram-bot";

const CODE_TTL_MS = 10 * 60 * 1000;

export type OtpProvider = "whatsapp" | "telegram";

function newCode(): string {
  return String(randomInt(0, 1_000_000)).padStart(6, "0");
}

/**
 * Generate + store a fresh code. Returns the code so the caller can send it.
 * Any prior unused codes for the same (provider, identifier) are invalidated.
 */
export async function createSignInCode(
  provider: OtpProvider,
  identifier: string,
): Promise<string> {
  const code = newCode();
  await prisma.signInCode.updateMany({
    where: { provider, identifier, usedAt: null },
    data: { usedAt: new Date() },
  });
  await prisma.signInCode.create({
    data: {
      provider,
      identifier,
      code,
      expiresAt: new Date(Date.now() + CODE_TTL_MS),
    },
  });
  return code;
}

/**
 * Send an OTP to the user via the chosen channel. WhatsApp uses their phone;
 * Telegram uses a chatId we already have (they must have /start'd our bot).
 */
export async function sendOtp(
  provider: OtpProvider,
  identifier: string,
  code: string,
): Promise<{ ok: true } | { ok: false; reason: string }> {
  const body = `Your Paperloft Assist sign-in code is ${code}. It expires in 10 minutes.`;
  if (provider === "whatsapp") {
    const res = await sendWhatsApp(identifier, body);
    return res.ok ? { ok: true } : { ok: false, reason: res.reason ?? "wasender failed" };
  }
  // Telegram: identifier is the chatId string.
  const res = await sendTelegramToChatId(identifier, body);
  return res.ok ? { ok: true } : { ok: false, reason: res.reason ?? "telegram failed" };
}

/**
 * Consume a code. Returns true if the (provider, identifier, code) matches
 * a live row; marks the row used on success. False for wrong code, expired,
 * or already-used codes.
 */
export async function verifySignInCode(
  provider: OtpProvider,
  identifier: string,
  code: string,
): Promise<boolean> {
  const row = await prisma.signInCode.findFirst({
    where: {
      provider,
      identifier,
      code,
      usedAt: null,
      expiresAt: { gt: new Date() },
    },
  });
  if (!row) return false;
  await prisma.signInCode.update({
    where: { id: row.id },
    data: { usedAt: new Date() },
  });
  return true;
}

/**
 * Build the synthetic email used to key OTP-authenticated users. Auth.js
 * expects an email; we don't have one for phone/telegram sign-ins, so we
 * mint a stable per-identity string.
 */
export function syntheticEmail(provider: OtpProvider, identifier: string): string {
  const cleaned = identifier.replace(/[^a-zA-Z0-9+._-]/g, "");
  return `${cleaned}@${provider}.paperloft.local`;
}
