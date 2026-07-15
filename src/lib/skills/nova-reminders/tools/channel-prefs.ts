import { tool } from "ai";
import { z } from "zod";
import type { SkillContext } from "../context";

/**
 * Channel preferences — user-facing knobs the agent can flip.
 * The host owns the actual chat ID linking (Telegram auto-link on
 * first bot message, WhatsApp opt-in link). Skill just reads/writes prefs.
 */

export function channelPrefsGet(ctx: SkillContext) {
  return tool({
    description:
      "Get the user's current reminder channel preferences (default channel, ack prompts, snooze defaults).",
    inputSchema: z.object({}),
    execute: async () => {
      const p = await ctx.prisma.userChannelPref.findUnique({
        where: { userId: ctx.userId },
      });
      if (!p) {
        return {
          exists: false,
          defaultChannel: "telegram",
          askAckOnGeneral: false,
          defaultSnoozeMinutes: [5, 10],
        };
      }
      return {
        exists: true,
        defaultChannel: p.defaultChannel,
        fallbackChannel: p.fallbackChannel,
        askAckOnGeneral: p.askAckOnGeneral,
        defaultSnoozeMinutes: p.defaultSnoozeMinutes,
        telegramLinked: !!p.telegramChatId,
        whatsappLinked: !!p.whatsappNumber,
      };
    },
  });
}

export function channelPrefsUpdate(ctx: SkillContext) {
  return tool({
    description:
      "Update the user's reminder channel preferences. Use when the user says things like 'send reminders to WhatsApp instead' or 'ask me to confirm every reminder'.",
    inputSchema: z.object({
      defaultChannel: z.enum(["telegram", "whatsapp"]).optional(),
      fallbackChannel: z.enum(["telegram", "whatsapp"]).nullable().optional(),
      askAckOnGeneral: z.boolean().optional(),
      defaultSnoozeMinutes: z.array(z.number().int().positive()).max(4).optional(),
    }),
    execute: async (input) => {
      const data: Record<string, unknown> = {};
      if (input.defaultChannel !== undefined) data.defaultChannel = input.defaultChannel;
      if (input.fallbackChannel !== undefined) data.fallbackChannel = input.fallbackChannel;
      if (input.askAckOnGeneral !== undefined) data.askAckOnGeneral = input.askAckOnGeneral;
      if (input.defaultSnoozeMinutes !== undefined) {
        data.defaultSnoozeMinutes = input.defaultSnoozeMinutes;
      }
      const row = await ctx.prisma.userChannelPref.upsert({
        where: { userId: ctx.userId },
        create: { userId: ctx.userId, ...data },
        update: data,
      });
      return {
        defaultChannel: row.defaultChannel,
        fallbackChannel: row.fallbackChannel,
        askAckOnGeneral: row.askAckOnGeneral,
      };
    },
  });
}
