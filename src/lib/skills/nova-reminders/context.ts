/**
 * Skill context — what the host injects when constructing the skill.
 *
 * The skill uses the HOST's Prisma client (no forked connection pool). The
 * host also supplies user identity + channel prefs + a file-storage helper.
 * Everything channel-specific (Telegram/WhatsApp send) is handled by the
 * host via `SkillCallbacks.onFire`.
 */

import type { PrismaClient } from "@prisma/client";
import type { SkillCallbacks } from "./types";

export interface SkillContext {
  /** The host's Prisma client — has our 4 models attached. */
  prisma: PrismaClient;
  /** Acting user id. Passed in per invocation from the host chat surface. */
  userId: string;
  /** Callbacks the skill invokes to reach the outside world. */
  callbacks: SkillCallbacks;
  /** Optional model bindings for prescription vision + freetext parse. */
  llm?: {
    /** Async function that returns extracted prescription JSON. */
    visionExtract?: (input: {
      imagePath?: string;
      pdfPath?: string;
    }) => Promise<string>;
    /** Async function for freetext med parsing. */
    textExtract?: (input: { text: string }) => Promise<string>;
  };
  /** Retention config — host-overridable. */
  retention?: {
    fileDays: number; // default 30
    prescriptionQuota: number; // default 10 live files
  };
}

export function retentionConfig(ctx: SkillContext) {
  return {
    fileDays: ctx.retention?.fileDays ?? 30,
    prescriptionQuota: ctx.retention?.prescriptionQuota ?? 10,
  };
}
