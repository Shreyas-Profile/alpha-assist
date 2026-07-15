// Reminders skill.
//
// The assistant calls `set_reminder` to schedule a message that gets sent
// via WhatsApp when the due time arrives. Delivery is handled by a cron
// that hits /api/cron/reminders — the tool itself just enqueues.
//
// Auto-enabled when the user signs in with WhatsApp (see src/lib/auth.ts).
// Configured via a phone number saved on the user's Integration row.

import { tool } from "ai";
import { z } from "zod";
import { prisma } from "../db";

export function makeRemindersSkill(userEmail: string) {
  return tool({
    description:
      "Schedule a reminder for the user to be delivered via WhatsApp at a specific time. Use when the user says things like 'remind me to X at Y' or 'in 30 min tell me Z'. Store the reminder — the cron handles delivery.",
    inputSchema: z.object({
      message: z.string().min(1).max(500).describe("What to remind the user. Keep it short."),
      dueAt: z
        .string()
        .describe("ISO-8601 UTC timestamp when the reminder should fire. Convert relative phrases like 'in 30 min' or 'tomorrow 9am' before calling."),
    }),
    execute: async ({ message, dueAt }) => {
      const due = new Date(dueAt);
      if (Number.isNaN(due.getTime())) {
        return { ok: false, error: `Invalid dueAt: ${dueAt}. Pass ISO-8601 UTC.` };
      }
      const row = await prisma.reminder.create({
        data: {
          userEmail,
          message,
          dueAt: due,
        },
      });
      return {
        ok: true,
        id: row.id,
        message: row.message,
        dueAt: row.dueAt.toISOString(),
        note:
          "Scheduled. Delivery via WhatsApp requires the wasenderapi key + your phone number on your integration; if either is missing you'll see the reminder in the app but not on WhatsApp.",
      };
    },
  });
}
