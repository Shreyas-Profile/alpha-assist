// Thin wrapper around https://wasenderapi.com — the WhatsApp sending API
// backing the Reminders skill. The env var setup:
//
//   WASENDER_API_KEY   — bearer token from your wasenderapi dashboard
//   WASENDER_FROM      — the wasenderapi phone number sending messages
//
// Both blank means the key hasn't been provisioned yet — sendWhatsApp() no-ops
// (logs + returns { ok: false, reason }) instead of throwing so the rest of
// the app keeps working during setup.

const API_BASE = "https://wasenderapi.com/api";

export interface WhatsAppSendResult {
  ok: boolean;
  reason?: string;
  messageId?: string;
}

export async function sendWhatsApp(toE164: string, message: string): Promise<WhatsAppSendResult> {
  const key = process.env.WASENDER_API_KEY;
  if (!key) {
    console.warn(
      `[wasender] skipping send — WASENDER_API_KEY not set. Would have sent to ${toE164}: ${message.slice(0, 60)}`,
    );
    return { ok: false, reason: "WASENDER_API_KEY not configured on this server" };
  }
  const res = await fetch(`${API_BASE}/send-message`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${key}`,
    },
    body: JSON.stringify({
      to: toE164,
      text: message,
    }),
  });
  // wasenderapi returns HTTP 200 with `{success:false,message:"…"}` when the
  // request was well-formed but delivery couldn't happen (e.g. the WhatsApp
  // session on their dashboard isn't linked, subscription lapsed, etc.).
  // Treat that as failure — otherwise we silently drop OTPs.
  const json = (await res.json().catch(() => ({}))) as {
    success?: boolean;
    message?: string;
    messageId?: string;
  };
  if (!res.ok || json.success === false) {
    const reason =
      json.message ??
      `wasenderapi HTTP ${res.status}`;
    return { ok: false, reason };
  }
  return { ok: true, messageId: json.messageId };
}
