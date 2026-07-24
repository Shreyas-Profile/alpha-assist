// Dedicated sign-in page. Auth.js redirects here when someone hits a
// protected route without a session. Telegram-only sign-in.
//
// WhatsApp OTP was removed after real users repeatedly got stuck on
// wasenderapi session drops — the Baileys-based provider silently accepts
// sends and later fails to deliver, leaving users with no way to sign in
// even when their code exists in the DB. Telegram Login Widget doesn't
// rely on OTP delivery at all — Telegram authenticates the user in their
// app / web session and hands us a signed payload directly. No drops.
//
// (WhatsApp Credentials provider stays defined in auth.ts as a code-level
// backdoor so any lingering JWTs keep working — the UI just doesn't
// surface it.)

import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { TelegramLoginButton } from "./telegram-login-button";

export default async function SignInPage({
  searchParams,
}: {
  searchParams: Promise<{ callbackUrl?: string; error?: string }>;
}) {
  const session = await auth();
  if (session?.user) redirect("/chat");
  const { error } = await searchParams;

  const botUsername = process.env.TELEGRAM_BOT_USERNAME;
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
            One tap to sign in with Telegram. No passwords, no OTPs.
          </p>
        </div>

        {error ? (
          <div className="text-sm text-red-500 border border-red-500/30 bg-red-500/10 rounded-lg px-3 py-2">
            {decodeURIComponent(error)}
          </div>
        ) : null}

        {botUsername ? (
          <div className="space-y-3">
            <TelegramLoginButton
              botUsername={botUsername}
              authUrl={telegramAuthUrl}
            />
            <p className="text-xs text-center text-muted-foreground">
              Tap the blue Telegram button above. Telegram will open, ask you
              to confirm, and bring you back signed in.
            </p>
          </div>
        ) : (
          <div className="rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-3 text-sm text-red-500">
            Telegram sign-in isn&apos;t configured on this server
            (TELEGRAM_BOT_USERNAME missing). Contact the admin.
          </div>
        )}

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
          Stuck? Email me:{" "}
          <a
            href="mailto:shreyas.pavuluri@gmail.com"
            className="underline hover:text-foreground"
          >
            shreyas.pavuluri@gmail.com
          </a>
          .
        </p>
      </div>
    </main>
  );
}
