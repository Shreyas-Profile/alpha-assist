"use client";

// Skills-marketplace card with per-user toggle. Renders in the RSC parent
// (skills/page.tsx) which passes the initial enabled state. Clicking the
// toggle POSTs to /api/skills/[skillId]/toggle and optimistically flips
// the local state so the UI feels instant.

import { useState } from "react";

export type SkillCardProps = {
  id: string;
  name: string;
  category: string;
  description: string;
  price: string;
  needs?: string;
  publisher?: string;
  initiallyEnabled: boolean;
};

export function SkillCard(props: SkillCardProps) {
  const [enabled, setEnabled] = useState(props.initiallyEnabled);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function toggle() {
    const next = !enabled;
    setPending(true);
    setError(null);
    // Optimistic — flip immediately, revert on error.
    setEnabled(next);
    try {
      const res = await fetch(`/api/skills/${props.id}/toggle`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ enabled: next }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
    } catch (e) {
      setEnabled(!next);
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setPending(false);
    }
  }

  return (
    <div
      className={`p-5 rounded-xl border transition ${
        enabled
          ? "border-accent/40 bg-accent/[0.04]"
          : "border-border bg-foreground/[0.02] hover:bg-foreground/[0.04]"
      }`}
    >
      <div className="flex items-start justify-between gap-3 mb-2">
        <div className="text-[10px] uppercase tracking-widest text-muted-foreground font-semibold">
          {props.category}
        </div>
        <span
          className={`text-[10px] uppercase tracking-wider px-2 py-0.5 rounded-full border ${
            enabled
              ? "text-emerald-600 dark:text-emerald-400 border-emerald-500/30 bg-emerald-500/10"
              : "text-muted-foreground border-border/60 bg-foreground/[0.03]"
          }`}
        >
          {enabled ? "Enabled" : "Disabled"}
        </span>
      </div>
      <h3 className="font-semibold text-lg">{props.name}</h3>
      <p className="text-sm text-muted-foreground mt-1.5 leading-relaxed">
        {props.description}
      </p>
      {props.needs ? (
        <div className="text-xs text-muted-foreground mt-3">
          Requires: <span className="text-foreground">{props.needs}</span>
        </div>
      ) : null}
      {props.publisher ? (
        <div className="text-xs text-muted-foreground mt-1">
          Published by <span className="text-foreground">{props.publisher}</span>
        </div>
      ) : null}
      <div className="flex items-center justify-between mt-5">
        <div className="text-lg font-semibold">{props.price}</div>
        <button
          type="button"
          role="switch"
          aria-checked={enabled}
          disabled={pending}
          onClick={toggle}
          className={`relative inline-flex h-6 w-11 items-center rounded-full transition ${
            enabled ? "bg-accent" : "bg-border"
          } ${pending ? "opacity-60 cursor-wait" : "cursor-pointer"}`}
        >
          <span
            className={`inline-block h-4 w-4 transform rounded-full bg-white transition ${
              enabled ? "translate-x-6" : "translate-x-1"
            }`}
          />
        </button>
      </div>
      {error ? (
        <div className="mt-3 text-xs text-red-500">Toggle failed: {error}</div>
      ) : null}
    </div>
  );
}
