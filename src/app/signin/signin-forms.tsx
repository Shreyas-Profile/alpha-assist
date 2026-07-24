"use client";

// Hybrid sign-in: WhatsApp phone-OTP as primary, Telegram Login Widget as
// fallback for when wasender's WhatsApp session drops or the classifier
// silently filters the OTP.
//
// UX flow:
//   1. Phone stage — pre-filled +91, "Send code on WhatsApp" button, plus a
//      subtle "or use Telegram instead" link.
//   2. Code stage — 6-digit input, "Verify + sign in", with a prominent
//      "Didn't get the code? Use Telegram instead" nudge below.
//   3. Telegram fallback — swaps the form for the official Telegram Login
//      Widget in-place. No page reload.
//
// The Telegram Login Widget hands off via the existing
// /api/auth/telegram-login route → /signin/telegram/handoff, so the widget
// wiring is identical to the earlier Telegram-only page.

import { useEffect, useRef, useState } from "react";
import { signIn } from "next-auth/react";
import { TelegramLoginButton } from "./telegram-login-button";

const DEFAULT_DIAL_CODE = "+91";

function sanitizePhone(raw: string): string {
  let v = raw.replace(/[^\d+]/g, "");
  v = v.replace(/(?!^)\+/g, "");
  if (v && !v.startsWith("+")) v = "+" + v;
  return v;
}

interface Props {
  callbackUrl: string;
  telegramBotUsername?: string;
  telegramAuthUrl?: string;
}

type Mode = "whatsapp" | "telegram";
type Stage = "phone" | "code";

export function SignInForms({
  callbackUrl,
  telegramBotUsername,
  telegramAuthUrl,
}: Props) {
  const [mode, setMode] = useState<Mode>("whatsapp");
  const [stage, setStage] = useState<Stage>("phone");
  const [phone, setPhone] = useState(DEFAULT_DIAL_CODE);
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);

  // "Didn't get the code" nudge appears prominently after N seconds so we
  // don't leave the user stranded when wasender silently drops the SMS.
  const [showTgNudge, setShowTgNudge] = useState(false);
  const nudgeTimer = useRef<number | null>(null);
  useEffect(() => {
    if (stage !== "code" || mode !== "whatsapp") return;
    nudgeTimer.current = window.setTimeout(() => setShowTgNudge(true), 30_000);
    return () => {
      if (nudgeTimer.current) window.clearTimeout(nudgeTimer.current);
    };
  }, [stage, mode]);

  const sendCode = async () => {
    setError(null);
    setInfo(null);
    const p = phone.trim();
    if (p === "" || p === DEFAULT_DIAL_CODE || !/^\+[1-9]\d{6,14}$/.test(p)) {
      setError(
        p === "" || p === DEFAULT_DIAL_CODE
          ? `Type your phone number after ${DEFAULT_DIAL_CODE}. Example: ${DEFAULT_DIAL_CODE}9876543210.`
          : `That doesn't look like a valid number. Use international format, e.g. ${DEFAULT_DIAL_CODE}9876543210.`,
      );
      return;
    }
    setBusy(true);
    try {
      const res = await fetch("/api/auth/otp/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ provider: "whatsapp", phone: p }),
      });
      const data = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) {
        setError(data.error ?? `HTTP ${res.status}`);
        return;
      }
      setStage("code");
      setInfo(`Code sent to ${p} on WhatsApp. Check your chats.`);
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

  const switchToTelegram = () => {
    setMode("telegram");
    setError(null);
    setInfo(null);
  };

  const switchBackToWhatsApp = () => {
    setMode("whatsapp");
    setStage("phone");
    setError(null);
    setInfo(null);
  };

  // ---------- Telegram fallback view ----------
  if (mode === "telegram") {
    return (
      <div className="space-y-4">
        <div className="rounded-lg border border-border/50 bg-foreground/[0.03] p-4 space-y-3">
          <p className="text-sm font-semibold">Sign in with Telegram instead</p>
          <p className="text-xs text-muted-foreground">
            Tap the blue Telegram button below. Telegram will open, ask you to
            confirm, and bring you back signed in. No OTP.
          </p>
          {telegramBotUsername && telegramAuthUrl ? (
            <TelegramLoginButton
              botUsername={telegramBotUsername}
              authUrl={telegramAuthUrl}
            />
          ) : (
            <p className="text-xs text-red-500">
              Telegram sign-in isn&apos;t configured on this server.
            </p>
          )}
        </div>
        <button
          type="button"
          onClick={switchBackToWhatsApp}
          className="w-full text-xs text-muted-foreground hover:text-foreground underline"
        >
          ← Back to WhatsApp
        </button>
      </div>
    );
  }

  // ---------- WhatsApp phone stage ----------
  return (
    <div className="space-y-3">
      {stage === "phone" && (
        <>
          <p className="text-sm text-muted-foreground">
            Enter your WhatsApp number. We&apos;ll send you a 6-digit code to
            sign in.
          </p>
          <input
            type="tel"
            inputMode="tel"
            autoComplete="tel"
            value={phone}
            onChange={(e) => setPhone(sanitizePhone(e.target.value))}
            placeholder={`${DEFAULT_DIAL_CODE}9876543210`}
            className={`w-full px-3 py-3 rounded-lg border bg-background font-mono text-base ${
              error ? "border-red-500/60" : "border-border"
            }`}
            disabled={busy}
            onKeyDown={(e) => {
              if (e.key === "Enter") sendCode();
            }}
            autoFocus
          />
          <p className="text-[11px] text-muted-foreground">
            Pre-filled with <span className="font-mono">{DEFAULT_DIAL_CODE}</span> for India.
            Outside India? Delete it and type your own country code (
            <span className="font-mono">+44</span> UK,{" "}
            <span className="font-mono">+1</span> US).
          </p>
          {error && (
            <div className="rounded border border-red-500/40 bg-red-500/10 px-3 py-2 text-sm text-red-500">
              {error}
            </div>
          )}
          <button
            type="button"
            onClick={sendCode}
            disabled={busy}
            className="w-full px-4 py-3 rounded-lg bg-foreground text-background font-semibold hover:opacity-90 disabled:opacity-50"
          >
            {busy ? "Sending…" : "Send code on WhatsApp"}
          </button>

          {telegramBotUsername && telegramAuthUrl && (
            <button
              type="button"
              onClick={switchToTelegram}
              className="w-full text-center text-sm text-muted-foreground hover:text-foreground py-2"
            >
              or use Telegram instead →
            </button>
          )}

          <p className="text-[11px] text-muted-foreground pt-1">
            Standard WhatsApp rates apply. Code expires in 10 minutes.
          </p>
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
            onChange={(e) =>
              setCode(e.target.value.replace(/\D/g, "").slice(0, 6))
            }
            placeholder="123456"
            className="w-full px-3 py-2 rounded-lg border border-border bg-background font-mono text-lg tracking-widest text-center"
            disabled={busy}
            onKeyDown={(e) => {
              if (e.key === "Enter") verify();
            }}
            autoFocus
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

          {telegramBotUsername && telegramAuthUrl && (
            <div
              className={`rounded-lg border p-3 space-y-2 transition ${
                showTgNudge
                  ? "border-amber-500/40 bg-amber-500/10"
                  : "border-border/50 bg-foreground/[0.02]"
              }`}
            >
              <p className="text-xs font-medium">
                {showTgNudge
                  ? "Still no code? Try Telegram."
                  : "Didn't get the code?"}
              </p>
              <p className="text-[11px] text-muted-foreground">
                WhatsApp OTPs sometimes drop for reasons we can&apos;t
                control. Telegram sign-in is one tap and always delivers.
              </p>
              <button
                type="button"
                onClick={switchToTelegram}
                className="w-full text-xs font-semibold px-3 py-2 rounded-md bg-foreground text-background hover:opacity-90"
              >
                Use Telegram instead →
              </button>
            </div>
          )}

          <button
            type="button"
            onClick={() => {
              setStage("phone");
              setCode("");
              setInfo(null);
              setError(null);
              setShowTgNudge(false);
            }}
            disabled={busy}
            className="w-full text-xs text-muted-foreground hover:text-foreground underline"
          >
            ← Use a different number
          </button>
        </>
      )}
    </div>
  );
}
