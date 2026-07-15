/**
 * @pakki10/nova-reminders — main entrypoint.
 *
 * Import in the host:
 *
 *   import { createReminderSkill } from "@pakki10/nova-reminders";
 *   const skill = createReminderSkill({ prisma, userId, callbacks, llm });
 *   const tools = skill.tools;   // register with your ai-sdk agent
 *
 * The host is also responsible for:
 *   1. Adding the Prisma models from `prisma/schema.prisma` to its own schema.
 *   2. Running the scheduler on a poll loop (`import { tick } from "@pakki10/nova-reminders/scheduler"`).
 *   3. Wiring channel adapters (Telegram / WhatsApp) to render envelopes and
 *      route inbound button/text back to `handleInbound()`.
 */

import type { ToolSet } from "ai";
import type { SkillContext } from "./context";
import type { InboundEvent } from "./types";

import {
  reminderCreate,
  reminderList,
  reminderGet,
  reminderUpdate,
  reminderDelete,
} from "./tools/reminder-crud";
import {
  prescriptionIngest,
  prescriptionConfirm,
  prescriptionList,
  prescriptionStar,
} from "./tools/prescription";
import { reminderAck, missedList } from "./tools/ack";
import { channelPrefsGet, channelPrefsUpdate } from "./tools/channel-prefs";

/** System-prompt fragment to hand to the agent so it uses the tools well. */
export const SKILL_SYSTEM_PROMPT = `You have a reminders skill with these capabilities:
- create/list/get/update/cancel reminders (general, medication, appointment types)
- upload prescriptions (image, PDF, or free text) → auto-extract meds + doctor + follow-up
- ack a reminder ("I took my meds", "done", "snooze 10 minutes")
- show missed reminders
- update user channel prefs (Telegram vs WhatsApp, snooze defaults)

Conventions:
- Medication reminders default to daily with a Taken/+10min/Skip button set.
- General reminders default to no buttons; only add ack buttons if the user's
  prefs say so or they explicitly ask ("remind me and make me confirm").
- When the user uploads a prescription, ALWAYS show the preview from
  prescription_ingest and let them approve before calling prescription_confirm.
- Never fabricate medications, doctor names, or dosages. If a field is unclear
  in a prescription, ask.
- When the user says "show my reminders" or "cancel the water one", use the
  list/update/delete tools directly — don't ask for an ID they don't know.
- Users can talk in natural language: "move my BP med to 9am", "stop the
  weekly one", "snooze this by an hour" — parse and call the right tool.`;

/**
 * Build the skill for one acting user + one host request.
 * Call this per-request from the host chat surface.
 */
export function createReminderSkill(ctx: SkillContext): {
  tools: ToolSet;
  systemPrompt: string;
  handleInbound: (event: InboundEvent) => Promise<{ handled: boolean; result?: unknown }>;
} {
  const tools: ToolSet = {
    reminder_create: reminderCreate(ctx),
    reminder_list: reminderList(ctx),
    reminder_get: reminderGet(ctx),
    reminder_update: reminderUpdate(ctx),
    reminder_delete: reminderDelete(ctx),
    reminder_ack: reminderAck(ctx),
    reminder_missed: missedList(ctx),
    prescription_ingest: prescriptionIngest(ctx),
    prescription_confirm: prescriptionConfirm(ctx),
    prescription_list: prescriptionList(ctx),
    prescription_star: prescriptionStar(ctx),
    channel_prefs_get: channelPrefsGet(ctx),
    channel_prefs_update: channelPrefsUpdate(ctx),
  };

  return {
    tools,
    systemPrompt: SKILL_SYSTEM_PROMPT,
    handleInbound: (event) => handleInbound(ctx, event),
  };
}

/**
 * Convert a button press into an ack. Adapters call this directly; the
 * agent is not in the loop for button clicks (they must be low-latency).
 */
export async function handleInbound(
  ctx: SkillContext,
  event: InboundEvent,
): Promise<{ handled: boolean; result?: unknown }> {
  if (event.buttonPress) {
    const { instanceId, buttonId } = event.buttonPress;
    if (buttonId.startsWith("snooze:")) {
      const minutes = parseInt(buttonId.split(":")[1], 10) || 10;
      const inst = await ctx.prisma.reminderInstance.findFirst({
        where: { id: instanceId, userId: ctx.userId },
      });
      if (!inst || inst.ackState !== "pending") return { handled: true, result: { alreadyAcked: true } };
      const newDue = new Date(Date.now() + minutes * 60_000);
      const child = await ctx.prisma.reminderInstance.create({
        data: {
          reminderId: inst.reminderId,
          userId: inst.userId,
          scheduledFor: newDue,
          ackState: "pending",
        },
      });
      await ctx.prisma.reminderInstance.update({
        where: { id: inst.id },
        data: {
          ackState: "snoozed",
          ackButtonId: buttonId,
          ackAt: new Date(),
          snoozedToInstanceId: child.id,
        },
      });
      return { handled: true, result: { snoozedUntil: newDue.toISOString() } };
    }

    const state = buttonMap(buttonId);
    if (!state) return { handled: false };
    await ctx.prisma.reminderInstance.updateMany({
      where: { id: instanceId, userId: ctx.userId, ackState: "pending" },
      data: {
        ackState: state,
        ackButtonId: buttonId,
        ackAt: new Date(),
      },
    });
    return { handled: true, result: { state } };
  }

  // Freetext handling stays in the agent path — the host should route
  // inbound text to Nova's ops-agent, which will call our tools directly.
  return { handled: false };
}

function buttonMap(id: string): "acked" | "skipped" | null {
  if (id === "taken" || id === "confirmed" || id === "ack" || id === "done") return "acked";
  if (id === "skip" || id === "skipped") return "skipped";
  if (id === "reschedule") return "skipped"; // agent will follow up to schedule
  return null;
}

export { tick } from "./scheduler/index";
export * from "./types";
export { EXTRACTOR_SYSTEM_PROMPT } from "./prescription/extract";
export { purgeExpired, enforceQuota } from "./prescription/retention";
