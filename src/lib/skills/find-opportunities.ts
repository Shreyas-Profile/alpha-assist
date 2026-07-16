// Skill: fetch_url
//
// A read-only tool the LLM can call to fetch ANY public web page as clean
// markdown. Runs the URL through Jina Reader, which turns JS-heavy pages
// into text the LLM can actually parse. Free, no API key, handles most
// sites out of the box (job boards, news articles, docs, product pages…).
//
// Historically this file was `find_opportunities` — scoped to a handful of
// UK apprenticeship / placement sites — and heavily narrowed via prompt.
// Shreyas wants the assistant to search anywhere on the web, so we
// generalised it to a plain "fetch any URL" tool. The exported symbol name
// is unchanged for import compatibility; the tool NAME the LLM sees is
// `fetch_url`, set via the `name` field on the tool config.

import { tool } from "ai";
import { z } from "zod";

// Cap how much markdown we return. Jina can return tens of KB on a listing
// page; blowing through the context window costs money AND makes the LLM
// worse at picking out the important bits.
const MAX_CHARS = 12000;

async function fetchViaJina(targetUrl: string): Promise<string> {
  // Jina Reader convention: prefix the URL with r.jina.ai/. Returns markdown.
  const jinaUrl = `https://r.jina.ai/${targetUrl}`;
  try {
    const res = await fetch(jinaUrl, {
      headers: { "X-Return-Format": "markdown" },
      signal: AbortSignal.timeout(20_000),
    });
    if (!res.ok) return `(fetch failed: HTTP ${res.status})`;
    const text = await res.text();
    return text.length > MAX_CHARS ? text.slice(0, MAX_CHARS) + "\n\n… [truncated]" : text;
  } catch (err) {
    return `(fetch error: ${err instanceof Error ? err.message : String(err)})`;
  }
}

export const findOpportunitiesTool = tool({
  description:
    "Fetch any public web page and return its content as clean markdown. Not scoped to any category — use it any time the user asks about something with a URL, whether that's an article, a Wikipedia page, product specs, a booking site, a dashboard, a listing, a recipe, docs, anything. If you don't know the exact URL, guess a canonical one (Google it in your head — sitename.com or sitename.com/search?q=…) and try. Prefer this over browser_* tools when a straight page fetch will do; it's an order of magnitude faster than driving Chrome.",
  inputSchema: z.object({
    url: z
      .string()
      .describe(
        "The full URL to fetch, including https://. Example: 'https://uk.indeed.com/jobs?q=AI+developer&l=Glasgow'.",
      ),
  }),
  execute: async ({ url }) => {
    const content = await fetchViaJina(url);
    return { url, content };
  },
});
