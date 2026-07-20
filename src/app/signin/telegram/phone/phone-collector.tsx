"use client";

import { useState } from "react";

const DEFAULT_DIAL_CODE = "+91";

function sanitizePhone(raw: string): string {
  let v = raw.replace(/[^\d+]/g, "");
  v = v.replace(/(?!^)\+/g, "");
  if (v && !v.startsWith("+")) v = "+" + v;
  return v;
}

export function PhoneCollector() {
  const [phone, setPhone] = useState(DEFAULT_DIAL_CODE);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const save = async () => {
    setError(null);
    const p = phone.trim();
    if (p === "" || p === DEFAULT_DIAL_CODE || !/^\+[1-9]\d{6,14}$/.test(p)) {
      setError(
        `Type your phone number after ${DEFAULT_DIAL_CODE}. Example: ${DEFAULT_DIAL_CODE}9876543210.`,
      );
      return;
    }
    setBusy(true);
    try {
      const res = await fetch("/api/auth/telegram/save-phone", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone: p }),
      });
      const data = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) {
        setError(data.error ?? `HTTP ${res.status}`);
        return;
      }
      // Go via the "which chat is the bot?" explainer, not straight to /chat.
      // Older users otherwise message the wrong Telegram chat and give up.
      window.location.href = "/signin/telegram/done";
    } catch (err) {
      setError((err as Error).message || "network error");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-3">
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
          if (e.key === "Enter") save();
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
        onClick={save}
        disabled={busy}
        className="w-full px-4 py-3 rounded-lg bg-foreground text-background font-semibold hover:opacity-90 disabled:opacity-50"
      >
        {busy ? "Saving…" : "Save + continue to chat →"}
      </button>
      <p className="text-[11px] text-muted-foreground pt-1">
        You can change this later in Settings.
      </p>
    </div>
  );
}
