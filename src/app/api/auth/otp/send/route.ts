// POST /api/auth/otp/send
//
// Body: { provider: "whatsapp" | "telegram", phone: string }
//   - phone: E.164, e.g. "+447700900123" (SAME format for both providers)
//
// Generates a 6-digit code, stores it, and delivers via the chosen channel.
// Returns { ok: true } on success. Returns 428 (Precondition Required) if the
// Telegram user hasn't linked their phone to the bot yet — the UI shows a
// deep-link to the bot in that case.

import { NextResponse } from "next/server";
import { createSignInCode, sendOtp, type OtpProvider } from "@/lib/otp";

// Telegram removed from user-facing sign-in — bot cold-DM restriction made
// the flow too fiddly. The provider stays defined in otp.ts for potential
// future opt-in from Settings; here we only accept whatsapp.
const PROVIDERS = new Set<OtpProvider>(["whatsapp"]);
// E.164: leading +, then 1-15 digits. Not a full validator — just a shape
// check to reject obvious garbage before we hit the delivery APIs.
const E164 = /^\+[1-9]\d{6,14}$/;

export async function POST(req: Request) {
  const body = (await req.json().catch(() => null)) as {
    provider?: string;
    // "identifier" kept as alias for backwards compat with the client.
    phone?: string;
    identifier?: string;
  } | null;
  const provider = body?.provider as OtpProvider | undefined;
  const phone = (body?.phone ?? body?.identifier)?.trim();
  if (!provider || !PROVIDERS.has(provider) || !phone) {
    return NextResponse.json(
      { error: "provider (whatsapp) and phone required." },
      { status: 400 },
    );
  }
  if (!E164.test(phone)) {
    return NextResponse.json(
      { error: "Phone must be in international format, e.g. +447700900123." },
      { status: 400 },
    );
  }
  const code = await createSignInCode(provider, phone);
  const send = await sendOtp(provider, phone, code);
  if (!send.ok) {
    console.warn(`[otp/send] delivery failed for ${provider} → ${phone}: ${send.reason}`);
    // 428 = "you need to do something first" — the UI catches this and shows
    // the bot deep-link instead of a plain error.
    if (send.needsBotStart) {
      return NextResponse.json({ error: send.reason }, { status: 428 });
    }
    // For every other send failure (session offline, invalid number, generic
    // wasender error): the CODE IS ALREADY IN THE DB. Wasender sometimes lies
    // about failure and delivers late, and the user still has a valid code to
    // enter if they happen to receive it (via any channel). Return 200 with a
    // `deliveryUncertain` flag so the client advances to the code-entry
    // stage AND surfaces the Telegram fallback prominently. Never leave the
    // user stranded on the phone screen with no way forward.
    return NextResponse.json({
      ok: true,
      deliveryUncertain: true,
      warning: send.reason,
    });
  }
  return NextResponse.json({ ok: true });
}
