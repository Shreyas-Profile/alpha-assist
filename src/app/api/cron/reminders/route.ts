// GET /api/cron/reminders — hit this every minute to fire due reminders.
//
// Hetzner setup: add a host cron:
//   * * * * * curl -s https://paperloft.uk/api/cron/reminders \
//       -H "Authorization: Bearer $CRON_SECRET" > /dev/null
//
// Auth: Bearer token via CRON_SECRET env var. Not user-facing.
//
// Delegates to the nova-reminders scheduler tick, which handles:
//   - firing pending reminders whose dueAt has passed (via onFire callback)
//   - escalating unacked reminders after their configured window
//   - marking long-unacked instances as missed
//   - rolling recurring reminders forward to their next occurrence

import { NextResponse } from "next/server";
import { tick } from "@/lib/skills/nova-reminders/scheduler";
import { makeReminderCtx } from "@/lib/reminders-adapter";

export const runtime = "nodejs";

export async function GET(req: Request) {
  const cronSecret = process.env.CRON_SECRET;
  const auth = req.headers.get("authorization") || "";
  if (!cronSecret || auth !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const result = await tick((userEmail) => makeReminderCtx(userEmail));
  return NextResponse.json({ ok: true, ...result });
}
