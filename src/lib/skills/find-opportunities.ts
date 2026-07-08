// Skill: find_opportunities
//
// A read-only tool the LLM can call when the user asks about UK apprenticeships,
// placements, or volunteering. It scrapes a few public sources through Jina
// Reader (which turns any URL into clean markdown) and returns the results for
// the LLM to filter and summarize.
//
// Jina Reader is free (no API key) and handles JS-heavy pages that a plain
// fetch would miss. Rate-limited but we're well under any limits.

import { tool } from "ai";
import { z } from "zod";

// Cap the amount of markdown we return to the LLM. Jina can return tens of KB
// on a listing page, which blows through the context window and costs a lot.
// The LLM only needs the top-of-page listing to pull matches out.
const MAX_CHARS_PER_SOURCE = 6000;
const MAX_TOTAL_CHARS = 12000;

// Sources are a shortlist of public UK opportunity search pages. We pick which
// one(s) to hit based on the category so we don't waste tokens on irrelevant
// sources. Add more here — Jina Reader handles most sites out of the box.
const SOURCES: Record<
  "apprenticeship" | "volunteering" | "placement",
  { name: string; url: (query: string) => string }[]
> = {
  apprenticeship: [
    {
      name: "gov.uk — Find an apprenticeship",
      url: (q) =>
        `https://www.findapprenticeship.service.gov.uk/apprenticeships?searchTerm=${encodeURIComponent(q)}`,
    },
  ],
  volunteering: [
    {
      name: "Do It — volunteering search",
      url: (q) => `https://doit.life/search?q=${encodeURIComponent(q)}`,
    },
    {
      name: "NCVO / gov.uk volunteering info",
      url: () => `https://www.gov.uk/volunteering`,
    },
  ],
  placement: [
    {
      name: "gov.uk — T Level industry placements",
      url: () => `https://www.gov.uk/guidance/industry-placements`,
    },
  ],
};

async function fetchViaJina(sourceName: string, targetUrl: string): Promise<string> {
  // Jina Reader convention: prefix the URL with r.jina.ai/. Returns markdown.
  const jinaUrl = `https://r.jina.ai/${targetUrl}`;
  try {
    const res = await fetch(jinaUrl, {
      // Tell Jina we want markdown and to skip the reader-header meta lines.
      headers: { "X-Return-Format": "markdown" },
      // Reasonable timeout — Jina + upstream can be slow.
      signal: AbortSignal.timeout(15_000),
    });
    if (!res.ok) {
      return `## ${sourceName}\n(fetch failed: HTTP ${res.status})\n`;
    }
    const text = await res.text();
    const clipped =
      text.length > MAX_CHARS_PER_SOURCE
        ? text.slice(0, MAX_CHARS_PER_SOURCE) + "\n\n… [truncated]"
        : text;
    return `## Source: ${sourceName}\nURL: ${targetUrl}\n\n${clipped}`;
  } catch (err) {
    return `## ${sourceName}\n(fetch error: ${err instanceof Error ? err.message : String(err)})\n`;
  }
}

export const findOpportunitiesTool = tool({
  description:
    "Search public UK youth-opportunity websites for apprenticeships, volunteering, or industry placements. Use this whenever the user is looking for real opportunities they can apply to (e.g. 'find a volunteering role in London', 'any apprenticeships in software for 16 year olds', 'DofE placements near me'). Do NOT use for general knowledge questions like 'what is an apprenticeship'.",
  inputSchema: z.object({
    query: z
      .string()
      .describe(
        "The search query. Include location, age, and interests if the user provided them. Example: 'software engineering apprenticeship London 16'",
      ),
    category: z
      .enum(["apprenticeship", "volunteering", "placement"])
      .describe(
        "Which category of opportunity to search. Pick 'apprenticeship' for paid work-based training, 'volunteering' for unpaid community/charity work, 'placement' for short school/college work experience.",
      ),
  }),
  execute: async ({ query, category }) => {
    const sources = SOURCES[category] ?? [];
    if (sources.length === 0) {
      return { results: "(no sources configured for this category)" };
    }

    // Fire all requests in parallel — Jina reader is external, so latency
    // dominates. Even 2-3 fetches barely add wall-clock over one.
    const chunks = await Promise.all(
      sources.map((s) => fetchViaJina(s.name, s.url(query))),
    );

    let combined = chunks.join("\n\n---\n\n");
    if (combined.length > MAX_TOTAL_CHARS) {
      combined =
        combined.slice(0, MAX_TOTAL_CHARS) +
        "\n\n… [combined output truncated — summarise what's visible]";
    }
    return { query, category, results: combined };
  },
});
