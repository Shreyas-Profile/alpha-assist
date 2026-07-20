// Shown after a fresh Telegram sign-in completes (phone saved). Its job is
// one thing: tell the user which Telegram chat is the actual bot vs the
// blue "Telegram" service chat where they authorized login.
//
// Real UX problem this fixes: after signing in with Telegram, the user sees
// two things in their Telegram sidebar:
//   1. The blue "Telegram" service chat (from telegram.org itself) with the
//      "Accepted" confirmation button — this is where they hit Confirm to
//      authorize the login. It looks Paperloft-related.
//   2. A NEW private chat from "Paperloft Assistant" — the actual bot.
//
// Older / non-technical users message #1, get no reply (because Telegram's
// service chat doesn't process user messages), and conclude the bot is
// broken. This page makes the distinction crystal clear and hands them a
// direct link to the right chat.

import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import Link from "next/link";

export default async function TelegramDonePage() {
  const session = await auth();
  if (!session?.user) redirect("/signin");

  const botUsername = process.env.TELEGRAM_BOT_USERNAME ?? "PaperloftAssistantBot";
  const botDeepLink = `https://t.me/${botUsername}`;

  return (
    <main className="min-h-screen flex items-center justify-center px-6 py-10">
      <div className="max-w-md w-full space-y-6">
        <div className="text-center space-y-2">
          <div className="w-12 h-12 rounded-full bg-emerald-500/15 text-emerald-500 flex items-center justify-center text-2xl mx-auto">
            ✓
          </div>
          <h1 className="text-2xl font-semibold">You&apos;re all set!</h1>
          <p className="text-muted-foreground text-sm">
            I just sent you a welcome message on Telegram.
          </p>
        </div>

        <div className="rounded-lg border border-amber-500/40 bg-amber-500/10 p-4 space-y-3">
          <p className="text-sm font-semibold">
            ⚠️ Important: which chat to talk to me in
          </p>
          <p className="text-sm text-muted-foreground">
            When you open Telegram, you&apos;ll see <strong>two</strong> chats
            related to Paperloft:
          </p>
          <div className="space-y-3 text-sm">
            <div className="flex gap-3 items-start">
              <div className="w-8 h-8 rounded-full bg-sky-500/20 text-sky-500 shrink-0 flex items-center justify-center text-xs font-bold">
                ✗
              </div>
              <div>
                <p className="font-medium">
                  Blue &quot;Telegram&quot; chat with a checkmark
                </p>
                <p className="text-xs text-muted-foreground">
                  This is Telegram itself confirming you logged in.{" "}
                  <span className="font-medium text-foreground">
                    Do NOT message here
                  </span>{" "}
                  — it won&apos;t reply.
                </p>
              </div>
            </div>
            <div className="flex gap-3 items-start">
              <div className="w-8 h-8 rounded-full bg-emerald-500/20 text-emerald-500 shrink-0 flex items-center justify-center text-xs font-bold">
                ✓
              </div>
              <div>
                <p className="font-medium">
                  New chat called{" "}
                  <span className="whitespace-nowrap">
                    &quot;Paperloft Assistant&quot;
                  </span>
                </p>
                <p className="text-xs text-muted-foreground">
                  This is me. Message me here — reminders, questions, anything.
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="space-y-2">
          <a
            href={botDeepLink}
            target="_blank"
            rel="noopener noreferrer"
            className="block w-full text-center px-4 py-3 rounded-lg bg-foreground text-background font-semibold hover:opacity-90"
          >
            Open Paperloft Assistant on Telegram →
          </a>
          <Link
            href="/chat"
            className="block w-full text-center px-4 py-3 rounded-lg border border-border text-sm hover:bg-foreground/5"
          >
            Or chat here in the browser
          </Link>
        </div>

        <p className="text-[11px] text-muted-foreground text-center">
          Both work — pick whichever&apos;s easier. Same brain, same memory.
        </p>
      </div>
    </main>
  );
}
