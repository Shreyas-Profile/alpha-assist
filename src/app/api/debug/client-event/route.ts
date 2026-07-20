// POST /api/debug/client-event
//
// Fire-and-forget client-side event logger for diagnosing bugs we can't
// reproduce on our own devices. Sign-in-form clicks POST here immediately
// before anything else runs, so if the user says "I clicked the button and
// nothing happened" we can look at the server log and see: (a) did the
// click event even reach the browser handler, (b) what was the form state
// at that moment, (c) what browser + OS they're on.
//
// Deliberately no auth, no rate limit — this is a diagnostic tap. Body is
// truncated to prevent log spam / abuse.

import { NextResponse } from "next/server";

export async function POST(req: Request) {
  const body = await req.text().catch(() => "");
  const ua = req.headers.get("user-agent") ?? "?";
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "?";
  const truncated = body.slice(0, 500);
  console.log(`[client-event] ip=${ip} ua=${ua.slice(0, 120)} body=${truncated}`);
  return NextResponse.json({ ok: true });
}
