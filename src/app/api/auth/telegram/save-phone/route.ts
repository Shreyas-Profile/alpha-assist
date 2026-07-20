// POST /api/auth/telegram/save-phone
//
// Called from the /signin/telegram/phone page after a Telegram widget
// sign-in. Body: { phone: string } in E.164. Saves the phone onto the
// current user's UserChannelPref row so reminders + future SMS/WhatsApp
// fallbacks have a number to reach them on.
//
// Auth: requires an active session. The user must have JUST signed in
// via Telegram — this endpoint doesn't verify the phone number (Telegram
// already verified the person's identity), it just associates it.

import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";

const E164 = /^\+[1-9]\d{6,14}$/;

export async function POST(req: Request) {
  const session = await auth();
  const email = session?.user?.email;
  if (!email) {
    return NextResponse.json({ error: "not signed in" }, { status: 401 });
  }
  const body = (await req.json().catch(() => null)) as { phone?: string } | null;
  const phone = body?.phone?.trim();
  if (!phone || !E164.test(phone)) {
    return NextResponse.json(
      { error: "Phone must be in international format, e.g. +919876543210." },
      { status: 400 },
    );
  }
  await prisma.userChannelPref.upsert({
    where: { userId: email },
    create: {
      userId: email,
      whatsappNumber: phone,
      defaultChannel: "telegram",
    },
    update: { whatsappNumber: phone },
  });
  return NextResponse.json({ ok: true });
}
