"use client";

import { useEffect, useRef } from "react";
import { useSearchParams } from "next/navigation";
import { signIn } from "next-auth/react";

export function TelegramHandoff() {
  const params = useSearchParams();
  const fired = useRef(false);

  useEffect(() => {
    if (fired.current) return;
    fired.current = true;
    const id = params.get("id");
    if (!id) {
      window.location.href = "/signin?error=telegram_missing_id";
      return;
    }
    signIn("telegram", {
      telegramId: id,
      firstName: params.get("first_name") ?? "",
      username: params.get("username") ?? "",
      photoUrl: params.get("photo_url") ?? "",
      // Route to the phone-collection step. That page immediately checks
      // whether we already have a phone for this user; if we do, it
      // redirects straight to /chat. So returning users see no extra step,
      // first-timers see the phone prompt once.
      callbackUrl: "/signin/telegram/phone",
    });
  }, [params]);

  return <span>Signing you in…</span>;
}
