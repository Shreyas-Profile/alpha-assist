"use client";

// Client-side messenger from Paperloft Assist to the chrome-agent Chrome extension.
//
// The extension declares `externally_connectable` for our origin, and adds
// a `chrome.runtime.onMessageExternal` listener that speaks the same
// {cmd, args} protocol the WebSocket path uses. So all we do here is
// forward the LLM's tool-call verbatim.
//
// The extension ID is a plain string like "abcdefghijklmnopabcdefghijklmnop" —
// copy it from chrome://extensions/ after loading the extension, paste into
// .env.local as NEXT_PUBLIC_ALPHA_ASSIST_EXTENSION_ID. Next.js inlines
// NEXT_PUBLIC_* env vars into the client bundle at build time.

type ChromeMinimal = {
  runtime?: {
    sendMessage?: (
      id: string,
      msg: unknown,
      cb: (reply: unknown) => void,
    ) => void;
    lastError?: { message: string };
  };
};

export type ExtensionReply = { ok: true; result: unknown } | { ok: false; error: string };

function rawCall(cmd: string, args: unknown): Promise<unknown> {
  const id = process.env.NEXT_PUBLIC_ALPHA_ASSIST_EXTENSION_ID;
  if (!id) {
    throw new Error(
      "Chrome extension isn't configured. Set NEXT_PUBLIC_ALPHA_ASSIST_EXTENSION_ID in .env.local (get the ID from chrome://extensions/).",
    );
  }
  const chromeApi = (globalThis as unknown as { chrome?: ChromeMinimal }).chrome;
  if (!chromeApi?.runtime?.sendMessage) {
    throw new Error(
      "This action needs the paperloft-assist Chrome extension installed and enabled. Open http://localhost:3000 in Chrome (not the sandboxed one Claude Code launches), install chrome-agent, then reload this page.",
    );
  }

  return new Promise((resolve, reject) => {
    setTimeout(() => {
      try {
        chromeApi.runtime!.sendMessage!(id, { cmd, args }, (reply) => {
          const err = chromeApi.runtime?.lastError;
          if (err) return reject(new Error(err.message));
          const r = reply as ExtensionReply | undefined;
          if (!r) return reject(new Error("Extension did not reply (may be uninstalled or reloading)."));
          if (!r.ok) return reject(new Error(r.error || "extension returned an error"));
          resolve(r.result);
        });
      } catch (e) {
        reject(e instanceof Error ? e : new Error(String(e)));
      }
    }, 0);
  });
}

// Session-scoped memory of the tab the LLM is currently driving. When
// browser_new_tab returns a tab_id, we remember it here, and every subsequent
// browser_click / browser_type / browser_snapshot / browser_read_page call
// gets that tab_id injected — even if the user has clicked away to a
// different tab. Prevents the "I clicked on chat and it clicked buttons in
// the Paperloft Assist UI instead of workit" failure mode.
let driveTabId: number | null = null;

async function newTabDedup(args: { url?: string }): Promise<unknown> {
  const wantUrl = args?.url;
  if (!wantUrl) {
    const r = (await rawCall("browser_new_tab", args)) as { tab_id?: number };
    if (r?.tab_id) driveTabId = r.tab_id;
    return r;
  }
  try {
    const tabs = (await rawCall("browser_list_tabs", {})) as Array<{
      id: number;
      url: string;
      title?: string;
    }>;
    const wantOrigin = new URL(wantUrl).origin;
    const existing = tabs.find((t) => {
      try {
        return new URL(t.url).origin === wantOrigin;
      } catch {
        return false;
      }
    });
    if (existing) {
      await rawCall("browser_activate_tab", { tab_id: existing.id });
      driveTabId = existing.id;
      return { tab_id: existing.id, url: existing.url, reused: true };
    }
  } catch {
    // Fall through to a plain new_tab if listing fails.
  }
  const r = (await rawCall("browser_new_tab", args)) as { tab_id?: number };
  if (r?.tab_id) driveTabId = r.tab_id;
  return r;
}

// Which browser_* commands need to be pinned to the drive tab so the user can
// switch tabs freely without breaking the flow. list_tabs / new_tab / status
// are intentionally excluded — they're either global or set the drive tab.
const PIN_TO_DRIVE_TAB = new Set([
  "browser_click",
  "browser_type",
  "browser_snapshot",
  "browser_read_page",
  "browser_press_key",
  "browser_scroll",
  "browser_wait_for",
  "browser_screenshot",
  "browser_evaluate",
  "browser_navigate",
]);

export async function callExtension(
  cmd: string,
  args: unknown,
): Promise<unknown> {
  if (cmd === "browser_new_tab") {
    return newTabDedup(args as { url?: string });
  }
  // Inject the remembered tab_id so browser_* calls hit the workit tab even
  // if the user has switched focus to the chat tab.
  if (PIN_TO_DRIVE_TAB.has(cmd) && driveTabId) {
    const merged = { ...(args as object), tab_id: (args as { tab_id?: number })?.tab_id ?? driveTabId };
    return rawCall(cmd, merged);
  }
  return rawCall(cmd, args);
}
