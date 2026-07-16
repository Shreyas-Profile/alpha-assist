"use client";

// Client component for the /settings "Connect Telegram" section.
// Server-side page fetches the current link state and passes it in.
// - No link yet: shows "Connect Telegram Bot" button. Click → POST link-init
//   → opens the deep-link in a new tab. User /starts the bot; webhook links
//   them. Page refreshes on refocus so the state updates.
// - Linked: shows the linked Telegram username + a Disconnect button.

import { useState, useTransition, useEffect } from "react";
import { useRouter } from "next/navigation";

export function TelegramConnect({
  linkedUsername,
  linkedFirstName,
}: {
  linkedUsername: string | null;
  linkedFirstName: string | null;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  // Refresh when the window regains focus — likely the user just came back
  // from Telegram after tapping /start.
  useEffect(() => {
    const onFocus = () => router.refresh();
    window.addEventListener("focus", onFocus);
    return () => window.removeEventListener("focus", onFocus);
  }, [router]);

  const connect = () => {
    setError(null);
    startTransition(async () => {
      const res = await fetch("/api/telegram/link-init", { method: "POST" });
      const j = (await res.json().catch(() => ({}))) as { deepLink?: string; error?: string };
      if (!res.ok || !j.deepLink) {
        setError(j.error ?? "Couldn't start the link.");
        return;
      }
      window.open(j.deepLink, "_blank", "noopener");
    });
  };

  const disconnect = () => {
    setError(null);
    startTransition(async () => {
      await fetch("/api/telegram/link-init", { method: "DELETE" });
      router.refresh();
    });
  };

  if (linkedUsername || linkedFirstName) {
    return (
      <div className="space-y-3">
        <div className="flex items-center gap-2 text-sm text-emerald-500">
          <span className="w-2 h-2 rounded-full bg-emerald-500" />
          Connected · {linkedUsername ? `@${linkedUsername}` : linkedFirstName}
        </div>
        <p className="text-xs text-muted-foreground">
          Reminders and notifications from Paperloft Assist will be sent to this Telegram chat.
        </p>
        <button
          type="button"
          onClick={disconnect}
          disabled={pending}
          className="px-3 py-1.5 rounded-md border border-border text-sm hover:bg-foreground/5 transition disabled:opacity-60"
        >
          {pending ? "Disconnecting…" : "Disconnect Telegram"}
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        Get Paperloft reminders and notifications straight in Telegram — one-time setup, no IDs to copy or paste.
      </p>
      <div className="rounded-lg border border-border/60 bg-foreground/[0.02] p-4 space-y-2">
        <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">How it works</p>
        <ol className="list-decimal list-inside text-xs text-muted-foreground space-y-1">
          <li>Click <b>Connect Telegram bot</b> below — a new tab opens Telegram with <a href="https://t.me/PaperloftAssistantBot" target="_blank" rel="noreferrer" className="text-accent underline">@PaperloftAssistantBot</a>.</li>
          <li>In Telegram, tap the blue <b>Start</b> button at the bottom of the chat (or type <code className="rounded bg-foreground/10 px-1">/start</code>).</li>
          <li>The bot replies <b>&quot;✅ Linked&quot;</b> — that&apos;s it. Come back to this tab; it refreshes automatically and this card will show &quot;Connected&quot;.</li>
        </ol>
        <p className="text-xs text-muted-foreground pt-1">
          Nothing to type here. Telegram tells our bot who you are the moment you tap Start.
        </p>
      </div>
      {error && <p className="text-xs text-red-500">{error}</p>}
      <button
        type="button"
        onClick={connect}
        disabled={pending}
        className="px-4 py-2 rounded-lg bg-foreground text-background text-sm font-medium hover:opacity-90 transition disabled:opacity-60"
      >
        {pending ? "Opening Telegram…" : "Connect Telegram bot"}
      </button>
    </div>
  );
}
