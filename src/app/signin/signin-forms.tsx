"use client";

// Three-provider sign-in — Google (OAuth), Telegram (Login Widget),
// or WhatsApp (phone + OTP delivered by wasenderapi).
//
// WhatsApp flow: user enters an E.164 phone → POST /api/auth/otp/send
// (wasenderapi delivers a 6-digit code) → user enters code → we call
// signIn("whatsapp", {phone, code, callbackUrl}) which hits the WhatsApp
// Credentials provider in lib/auth.ts, which verifies the code and mints a
// synthetic <phone>@phone.paperloft.local identity.

import { useEffect, useRef, useState } from "react";
import { signIn } from "next-auth/react";

type Tab = "google" | "whatsapp" | "telegram";

const BOT_USERNAME = "PaperloftAssistantBot";

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
      {tab === "whatsapp" && <WhatsAppForm callbackUrl={callbackUrl} />}
      {tab === "telegram" && <TelegramForm />}
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

function WhatsAppForm({ callbackUrl }: { callbackUrl: string }) {
  const [stage, setStage] = useState<"phone" | "code">("phone");
  const [phone, setPhone] = useState("");
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);

  const sendCode = async () => {
    setError(null);
    setInfo(null);
    // Client-side E.164 check so users get instant feedback on obvious typos.
    // Real validation lives on the server.
    if (!/^\+[1-9]\d{6,14}$/.test(phone.trim())) {
      setError("Phone must be in international format, e.g. +447700900123.");
      return;
    }
    setBusy(true);
    try {
      const res = await fetch("/api/auth/otp/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ provider: "whatsapp", phone: phone.trim() }),
      });
      const data = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) {
        setError(data.error ?? `HTTP ${res.status}`);
      } else {
        setStage("code");
        setInfo(`Code sent to ${phone.trim()} on WhatsApp. Check your chats.`);
      }
    } catch (err) {
      setError((err as Error).message || "network error");
    } finally {
      setBusy(false);
    }
  };

  const verify = async () => {
    setError(null);
    if (!/^\d{6}$/.test(code.trim())) {
      setError("Code must be 6 digits.");
      return;
    }
    setBusy(true);
    try {
      const res = await signIn("whatsapp", {
        phone: phone.trim(),
        code: code.trim(),
        callbackUrl,
        redirect: false,
      });
      if (res?.error) {
        setError("Wrong or expired code. Try again, or send a new one.");
      } else if (res?.ok) {
        // Manual redirect since we passed redirect:false so we could catch errors inline.
        window.location.href = res.url ?? callbackUrl;
      } else {
        setError("Sign-in failed. Try again.");
      }
    } catch (err) {
      setError((err as Error).message || "network error");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-3">
      <p className="text-xs text-muted-foreground">
        We&apos;ll send a 6-digit code to your WhatsApp. Enter your number in
        international format (with country code).
      </p>

      {stage === "phone" && (
        <>
          <input
            type="tel"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="+447700900123"
            className="w-full px-3 py-2 rounded-lg border border-border bg-background font-mono text-sm"
            disabled={busy}
            onKeyDown={(e) => {
              if (e.key === "Enter") sendCode();
            }}
          />
          {error && <p className="text-xs text-red-500">{error}</p>}
          <button
            type="button"
            onClick={sendCode}
            disabled={busy || !phone}
            className="w-full px-4 py-2.5 rounded-lg bg-foreground text-background font-medium hover:opacity-90 disabled:opacity-50"
          >
            {busy ? "Sending…" : "Send code"}
          </button>
        </>
      )}

      {stage === "code" && (
        <>
          {info && (
            <div className="rounded border border-emerald-500/30 bg-emerald-500/10 px-3 py-2 text-xs text-emerald-500">
              {info}
            </div>
          )}
          <input
            type="text"
            inputMode="numeric"
            autoComplete="one-time-code"
            value={code}
            onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
            placeholder="123456"
            className="w-full px-3 py-2 rounded-lg border border-border bg-background font-mono text-lg tracking-widest text-center"
            disabled={busy}
            onKeyDown={(e) => {
              if (e.key === "Enter") verify();
            }}
          />
          {error && <p className="text-xs text-red-500">{error}</p>}
          <button
            type="button"
            onClick={verify}
            disabled={busy || code.length !== 6}
            className="w-full px-4 py-2.5 rounded-lg bg-foreground text-background font-medium hover:opacity-90 disabled:opacity-50"
          >
            {busy ? "Verifying…" : "Verify + sign in"}
          </button>
          <button
            type="button"
            onClick={() => {
              setStage("phone");
              setCode("");
              setInfo(null);
              setError(null);
            }}
            disabled={busy}
            className="w-full text-xs text-muted-foreground hover:text-foreground underline"
          >
            ← Use a different number
          </button>
        </>
      )}

      <p className="text-[11px] text-muted-foreground">
        Standard WhatsApp rates apply. Code expires in 10 minutes.
      </p>
    </div>
  );
}

function TelegramForm() {
  const containerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!containerRef.current) return;
    // Clear any prior widget iframe (e.g. React StrictMode re-mount).
    containerRef.current.innerHTML = "";
    const s = document.createElement("script");
    s.async = true;
    s.src = "https://telegram.org/js/telegram-widget.js?22";
    s.setAttribute("data-telegram-login", BOT_USERNAME);
    s.setAttribute("data-size", "large");
    s.setAttribute("data-radius", "10");
    s.setAttribute("data-auth-url", "/api/auth/telegram-login");
    s.setAttribute("data-request-access", "write");
    containerRef.current.appendChild(s);
  }, []);

  return (
    <div className="space-y-3">
      <p className="text-xs text-muted-foreground">
        Click the button to sign in with your Telegram account. Telegram will show a confirmation popup — approve it and you&apos;re in.
      </p>
      <div ref={containerRef} className="flex justify-center min-h-[46px]" />
      <p className="text-[11px] text-muted-foreground">
        We only receive your Telegram id, name, and (if set) username & photo. No phone number, no message history.
      </p>
    </div>
  );
}
