// Dedicated sign-in page. Auth.js redirects here when someone hits a
// protected route without a session.
//
// Hybrid sign-in:
//   1. WhatsApp phone-OTP as the primary path — familiar and low-friction
//      for users who've done phone-OTP a hundred times before. Delivery
//      via wasenderapi with the intro-then-code pattern in otp.ts to keep
//      out of WhatsApp's spam classifier as best we can.
//   2. Telegram Login Widget as the fallback — one tap, no delivery
//      required, kicks in either from the "or use Telegram instead" link
//      on the phone screen or the "Didn't get the code?" nudge on the OTP
//      screen. Never fails silently.
//
// The Telegram widget's HMAC verify + NextAuth handoff still live at
// /api/auth/telegram-login → /signin/telegram/handoff, unchanged.

import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { SignInForms } from "./signin-forms";

export default async function SignInPage({
  searchParams,
}: {
  searchParams: Promise<{ callbackUrl?: string; error?: string }>;
}) {
  const session = await auth();
  if (session?.user) redirect("/chat");
  const { callbackUrl = "/chat", error } = await searchParams;

  const botUsername = process.env.TELEGRAM_BOT_USERNAME;
  // Absolute callback URL for the Telegram widget. The widget silently
  // ignores relative URLs and defaults to the current page, which would
  // route the signed callback to /signin (no verifier there) instead of
  // /api/auth/telegram-login. AUTH_URL is our canonical origin.
  const authBase = (process.env.AUTH_URL ?? "https://paperloft.uk").replace(
    /\/$/,
    "",
  );
  const telegramAuthUrl = `${authBase}/api/auth/telegram-login`;

  return (
    <main className="min-h-screen flex items-center justify-center px-6 py-10">
      <div className="max-w-md w-full space-y-6">
        <div className="text-center space-y-2">
          <div className="w-10 h-10 rounded-lg bg-foreground text-background flex items-center justify-center font-bold mx-auto">
            P
          </div>
          <h1 className="text-2xl font-semibold">Sign in to Paperloft</h1>
          <p className="text-muted-foreground text-sm">
            Sign in with WhatsApp or Telegram — whichever&apos;s easier.
          </p>
        </div>

        {error ? (
          <div className="text-sm text-red-500 border border-red-500/30 bg-red-500/10 rounded-lg px-3 py-2">
            {decodeURIComponent(error)}
          </div>
        ) : null}

        <SignInForms
          callbackUrl={callbackUrl}
          telegramBotUsername={botUsername}
          telegramAuthUrl={telegramAuthUrl}
        />

        <details className="group rounded-lg border border-border bg-foreground/[0.02] px-3 py-2">
          <summary className="cursor-pointer text-sm font-medium select-none list-none flex items-center justify-between">
            <span>Never used Telegram before? Here&apos;s a 2-minute setup.</span>
            <span className="text-muted-foreground text-xs group-open:rotate-180 transition">▾</span>
          </summary>
          <div className="pt-3 space-y-3">
            <ol className="text-sm text-muted-foreground space-y-2 list-decimal list-outside pl-5">
              <li>
                <span className="font-medium text-foreground">Download the app.</span>{" "}
                Use one of the buttons below (iPhone / Android). Telegram is a
                free chat app like WhatsApp — different company, similar idea.
              </li>
              <li>
                <span className="font-medium text-foreground">Open the app</span>{" "}
                and tap <span className="italic">Start Messaging</span>.
              </li>
              <li>
                <span className="font-medium text-foreground">Pick your country and enter your phone number.</span>{" "}
                Same one as your WhatsApp is fine.
              </li>
              <li>
                <span className="font-medium text-foreground">Type the 5-digit code</span>{" "}
                Telegram sends you by SMS.
              </li>
              <li>
                <span className="font-medium text-foreground">Enter your first name.</span>{" "}
                Last name is optional.
              </li>
              <li>
                Come back to this tab, tap the blue{" "}
                <span className="font-medium text-foreground">
                  Log in with Telegram
                </span>{" "}
                button, and you&apos;re in.
              </li>
            </ol>

            <div className="flex flex-col sm:flex-row gap-2 pt-1">
              <a
                href="https://apps.apple.com/app/telegram-messenger/id686449807"
                target="_blank"
                rel="noopener noreferrer"
                className="flex-1 text-center rounded-lg border border-border px-3 py-2 text-sm hover:bg-foreground/5 transition"
              >
                Get for iPhone
              </a>
              <a
                href="https://play.google.com/store/apps/details?id=org.telegram.messenger"
                target="_blank"
                rel="noopener noreferrer"
                className="flex-1 text-center rounded-lg border border-border px-3 py-2 text-sm hover:bg-foreground/5 transition"
              >
                Get for Android
              </a>
              <a
                href="https://web.telegram.org/"
                target="_blank"
                rel="noopener noreferrer"
                className="flex-1 text-center rounded-lg border border-border px-3 py-2 text-sm hover:bg-foreground/5 transition"
              >
                Use in browser
              </a>
            </div>
          </div>
        </details>

        <p className="text-[11px] text-muted-foreground text-center">
          Stuck? Message me on WhatsApp:{" "}
          <a
            href="https://wa.me/447404660489"
            className="underline hover:text-foreground"
          >
            +44 7404 660489
          </a>
          .
        </p>
      </div>
    </main>
  );
}
