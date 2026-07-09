// Client-side browser tools.
//
// These have NO `execute` function on purpose. When the LLM calls one, the
// tool-call streams to the browser tab (via toDataStreamResponse), the
// client-side chat view catches it, forwards it to the chrome-agent Chrome
// extension, and calls addToolResult() with whatever the extension returns.
//
// See src/lib/browser-bridge.ts (client bridge) and chat-view.tsx (onToolCall).
//
// The set is intentionally small — enough to search a login-gated site like
// workit.info end-to-end (navigate → snapshot → click → type → read). If the
// LLM demonstrates it needs more (screenshot, wait_for, scroll), add them.

import { tool } from "ai";
import { z } from "zod";

export const browserNavigate = tool({
  description:
    "Open a URL in the active tab (or a new tab if none is suitable). Use this to reach the search page of a site the user is signed into (e.g. workit.info).",
  inputSchema: z.object({
    url: z.string().describe("Full URL to navigate to."),
  }),
});

export const browserSnapshot = tool({
  description:
    "Return a compact accessibility snapshot of the current tab: role, name, and a stable `uid` per element. ALWAYS call this before clicking or typing on an unfamiliar page — CSS selectors on modern sites are fragile, but uids from the snapshot are stable.",
  inputSchema: z.object({}),
});

export const browserClick = tool({
  description:
    "Click an element. Pass `uid` from browser_snapshot (preferred) OR a CSS `selector` (fallback).",
  inputSchema: z.object({
    uid: z.string().optional(),
    selector: z.string().optional(),
  }),
});

export const browserType = tool({
  description:
    "Focus an input and type text. Pass `uid` (preferred) or `selector`. Set `press_enter: true` if hitting Enter after the text should submit the field.",
  inputSchema: z.object({
    uid: z.string().optional(),
    selector: z.string().optional(),
    text: z.string(),
    press_enter: z.boolean().optional(),
  }),
});

export const browserReadPage = tool({
  description:
    "Return the visible text of the current tab (up to 20 000 chars). Use this AFTER a search or filter has been applied to extract the results the user actually wants.",
  inputSchema: z.object({}),
});
