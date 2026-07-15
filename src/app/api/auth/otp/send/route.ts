// POST /api/auth/otp/send
//
// Body: { provider: "whatsapp" | "telegram", identifier: string }
//   - whatsapp: identifier is E.164 phone number, e.g. "+447700900123"
//   - telegram: identifier is the chatId the user got from our bot after /start
//
// Generates a 6-digit code, stores it, and delivers via the chosen channel.
// Returns { ok: true } — never returns the code (would defeat the purpose).

import { NextResponse } from "next/server";
import { createSignInCode, sendOtp, type OtpProvider } from "@/lib/otp";

const PROVIDERS = new Set<OtpProvider>(["whatsapp", "telegram"]);

export async function POST(req: Request) {
  const body = (await req.json().catch(() => null)) as {
    provider?: string;
    identifier?: string;
  } | null;
  const provider = body?.provider as OtpProvider | undefined;
  const identifier = body?.identifier?.trim();
  if (!provider || !PROVIDERS.has(provider) || !identifier) {
    return NextResponse.json(
      { error: "Provider (whatsapp|telegram) and identifier required." },
      { status: 400 },
    );
  }
  const code = await createSignInCode(provider, identifier);
  const send = await sendOtp(provider, identifier, code);
  if (!send.ok) {
    return NextResponse.json({ error: send.reason }, { status: 502 });
  }
  return NextResponse.json({ ok: true });
}
