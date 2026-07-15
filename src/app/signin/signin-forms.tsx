"use client";

// Tabbed sign-in — Google, WhatsApp OTP, Telegram OTP.
// The two OTP flows have the same shape:
//   1. Enter identifier (phone / chatId) → POST /api/auth/otp/send
//   2. Enter received code → signIn("whatsapp" | "telegram", { identifier, code })
// The server credentials provider validates + creates the session.

import { useState, useTransition } from "react";
import { signIn } from "next-auth/react";

type Tab = "google" | "whatsapp" | "telegram";

export function SignInForms({ callbackUrl }: { callbackUrl: string }) {
  const [tab, setTab] = useState<Tab>("google");
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-3 gap-1 p-1 rounded-lg bg-foreground/[0.05] border border-border">
        <TabBtn active={tab === "google"} onClick={() => setTab("google")}>Google</TabBtn>
        <TabBtn active={tab === "whatsapp"} onClick={() => setTab("whatsapp")}>WhatsApp</TabBtn>
        <TabBtn active={tab === "telegram"} onClick={() => setTab("telegram")}>Telegram</TabBtn>
      </div>
      {tab === "google" && <GoogleForm callbackUrl={callbackUrl} />}
      {tab === "whatsapp" && <OtpForm provider="whatsapp" callbackUrl={callbackUrl} />}
      {tab === "telegram" && <OtpForm provider="telegram" callbackUrl={callbackUrl} />}
    </div>
  );
}

function TabBtn({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`px-3 py-1.5 text-sm rounded-md font-medium transition ${
        active
          ? "bg-background text-foreground shadow-sm"
          : "text-muted-foreground hover:text-foreground"
      }`}
    >
      {children}
    </button>
  );
}

function GoogleForm({ callbackUrl }: { callbackUrl: string }) {
  return (
    <button
      type="button"
      onClick={() => signIn("google", { callbackUrl })}
      className="w-full px-4 py-2.5 rounded-lg border border-border bg-foreground text-background font-medium hover:opacity-90 transition"
    >
      Continue with Google
    </button>
  );
}

function OtpForm({
  provider,
  callbackUrl,
}: {
  provider: "whatsapp" | "telegram";
  callbackUrl: string;
}) {
  const [step, setStep] = useState<"identifier" | "code">("identifier");
  const [identifier, setIdentifier] = useState("");
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const sendCode = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    startTransition(async () => {
      const res = await fetch("/api/auth/otp/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ provider, identifier: identifier.trim() }),
      });
      const j = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) {
        setError(j.error ?? "Failed to send code.");
        return;
      }
      setStep("code");
    });
  };

  const verify = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    startTransition(async () => {
      const result = await signIn(provider, {
        identifier: identifier.trim(),
        code: code.trim(),
        callbackUrl,
        redirect: false,
      });
      if (result?.error) {
        setError("Wrong or expired code. Try requesting a new one.");
        return;
      }
      window.location.href = callbackUrl;
    });
  };

  if (step === "identifier") {
    return (
      <form onSubmit={sendCode} className="space-y-3">
        {provider === "telegram" ? (
          <p className="text-xs text-muted-foreground">
            First, open{" "}
            <a
              href="https://t.me/shreyasassistantbot"
              target="_blank"
              className="text-accent underline"
              rel="noreferrer"
            >
              @shreyasassistantbot
            </a>{" "}
            and send <code className="rounded bg-foreground/10 px-1">/start</code>. Copy the id it replies with and paste it below.
          </p>
        ) : (
          <p className="text-xs text-muted-foreground">
            Enter your WhatsApp number in international format (e.g. +447700900123). We&apos;ll text you a 6-digit code.
          </p>
        )}
        <input
          type="text"
          value={identifier}
          onChange={(e) => setIdentifier(e.target.value)}
          placeholder={provider === "whatsapp" ? "+447700900123" : "123456789"}
          className="w-full px-3 py-2 rounded-md border border-border bg-transparent text-sm focus:outline-none focus:ring-2 focus:ring-accent"
        />
        {error && <p className="text-xs text-red-500">{error}</p>}
        <button
          type="submit"
          disabled={pending || !identifier.trim()}
          className="w-full px-4 py-2.5 rounded-lg border border-border bg-foreground text-background font-medium hover:opacity-90 transition disabled:opacity-60"
        >
          {pending ? "Sending…" : "Send code"}
        </button>
      </form>
    );
  }

  return (
    <form onSubmit={verify} className="space-y-3">
      <p className="text-xs text-muted-foreground">
        Enter the 6-digit code we just sent to <b>{identifier}</b>.
      </p>
      <input
        type="text"
        value={code}
        onChange={(e) => setCode(e.target.value)}
        placeholder="123456"
        inputMode="numeric"
        maxLength={6}
        className="w-full px-3 py-2 rounded-md border border-border bg-transparent text-sm font-mono tracking-widest text-center focus:outline-none focus:ring-2 focus:ring-accent"
      />
      {error && <p className="text-xs text-red-500">{error}</p>}
      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => {
            setStep("identifier");
            setCode("");
          }}
          className="px-3 py-2 rounded-md border border-border text-sm hover:bg-foreground/5 transition"
        >
          Back
        </button>
        <button
          type="submit"
          disabled={pending || code.length < 4}
          className="flex-1 px-4 py-2.5 rounded-lg border border-border bg-foreground text-background font-medium hover:opacity-90 transition disabled:opacity-60"
        >
          {pending ? "Verifying…" : "Sign in"}
        </button>
      </div>
    </form>
  );
}
