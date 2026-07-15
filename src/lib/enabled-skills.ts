// Per-user skill enablement — thin wrapper over the EnabledSkill Prisma model.
// Skills marketplace UI shows one toggle per skill; enabling writes a row,
// disabling deletes it. Absence of a row = disabled.

import { prisma } from "./db";

export async function listEnabledSkills(userEmail: string): Promise<Set<string>> {
  const rows = await prisma.enabledSkill.findMany({
    where: { userEmail },
    select: { skillId: true },
  });
  return new Set(rows.map((r) => r.skillId));
}

export async function isSkillEnabled(userEmail: string, skillId: string): Promise<boolean> {
  const row = await prisma.enabledSkill.findUnique({
    where: { userEmail_skillId: { userEmail, skillId } },
  });
  return !!row;
}

export async function enableSkill(userEmail: string, skillId: string): Promise<void> {
  await prisma.enabledSkill.upsert({
    where: { userEmail_skillId: { userEmail, skillId } },
    create: { userEmail, skillId },
    update: {}, // no-op — enabling twice is idempotent
  });
}

export async function disableSkill(userEmail: string, skillId: string): Promise<void> {
  await prisma.enabledSkill
    .delete({
      where: { userEmail_skillId: { userEmail, skillId } },
    })
    .catch(() => undefined); // already disabled = fine
}
