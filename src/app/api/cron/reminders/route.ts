// GET /api/cron/reminders — hit this every minute to send due reminders.
//
// Hetzner setup: add a host cron:
//   * * * * * curl -s https://paperloft.regiq.in/api/cron/reminders \
//       -H "Authorization: Bearer $CRON_SECRET" > /dev/null
//
// Auth: Bearer token via CRON_SECRET env var. Not user-facing.

import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getIntegration } from "@/lib/integrations";
import { sendWhatsApp } from "@/lib/wasender";

export const runtime = "nodejs";

export async function GET(req: Request) {
  const cronSecret = process.env.CRON_SECRET;
  const auth = req.headers.get("authorization") || "";
  if (!cronSecret || auth !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const now = new Date();
  const due = await prisma.reminder.findMany({
    where: { dueAt: { lte: now }, sentAt: null },
    take: 50,
  });
  const results: Array<{ id: string; ok: boolean; reason?: string }> = [];
  for (const r of due) {
    // Resolve the user's WhatsApp number from their Integration row.
    const wa = await getIntegration(r.userEmail, "whatsapp");
    if (!wa?.phone) {
      results.push({ id: r.id, ok: false, reason: "no WhatsApp integration" });
      continue;
    }
    const send = await sendWhatsApp(wa.phone, r.message);
    if (send.ok) {
      await prisma.reminder.update({ where: { id: r.id }, data: { sentAt: new Date() } });
    }
    results.push({ id: r.id, ok: send.ok, reason: send.reason });
  }

  return NextResponse.json({ processed: results.length, results });
}
