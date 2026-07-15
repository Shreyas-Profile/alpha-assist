// LinkedIn posting skill — server-side execute. Needs the current user's email
// which we can't hard-code, so this is exported as a *factory* that the chat
// route calls with the authed email at request time.

import { tool } from "ai";
import { z } from "zod";

import { postToLinkedIn } from "../linkedin";
import { getIntegration } from "../integrations";

export function makeLinkedInSkill(userEmail: string) {
  return tool({
    description:
      "Post a text update to the user's LinkedIn feed. Use this only when the user explicitly asks to publish to LinkedIn, and read back the drafted text for approval BEFORE calling this. Max ~3000 characters. Returns { postUrn } on success.",
    inputSchema: z.object({
      text: z
        .string()
        .min(1)
        .max(3000)
        .describe("The exact post content. Include line breaks as \\n. Do not include hashtags unless the user asked for them."),
    }),
    execute: async ({ text }) => {
      const integ = await getIntegration(userEmail, "linkedin");
      if (!integ) {
        return {
          ok: false,
          error:
            "LinkedIn isn't connected. Ask the user to go to Settings → Connect LinkedIn first.",
        };
      }
      try {
        const { postUrn } = await postToLinkedIn(userEmail, text);
        return { ok: true, postUrn };
      } catch (e) {
        return {
          ok: false,
          error: e instanceof Error ? e.message : String(e),
        };
      }
    },
  });
}
