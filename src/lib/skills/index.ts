// Skill registry. Import from here and pass to `streamText({ tools })`.
// One skill for now; when we have several, group them here (or auto-load from
// a folder). Keeping it explicit for now — the LLM only sees skills we export.

import { findOpportunitiesTool } from "./find-opportunities";

export const skills = {
  find_opportunities: findOpportunitiesTool,
} as const;
