/**
 * Retention: purge prescription files after the configured window OR when
 * a user exceeds their quota. Metadata (extractedText, medications, doctor)
 * is always kept — only the raw file is deleted.
 */

import type { SkillContext } from "../context";
import { retentionConfig } from "../context";

/** Called after a new prescription is inserted. Purges oldest over quota. */
export async function enforceQuota(
  ctx: SkillContext,
  userId: string,
): Promise<{ purgedIds: string[] }> {
  const { prescriptionQuota } = retentionConfig(ctx);
  const withFiles = await ctx.prisma.prescription.findMany({
    where: { userId, fileRef: { not: null }, starred: false },
    orderBy: { createdAt: "asc" },
    select: { id: true, fileRef: true },
  });
  const excess = Math.max(0, withFiles.length - prescriptionQuota);
  const purgedIds: string[] = [];
  for (let i = 0; i < excess; i++) {
    const row = withFiles[i];
    if (!row) break;
    if (row.fileRef && ctx.callbacks.purgeUserFile) {
      await ctx.callbacks.purgeUserFile(row.fileRef).catch(() => {});
    }
    await ctx.prisma.prescription.update({
      where: { id: row.id },
      data: { fileRef: null },
    });
    purgedIds.push(row.id);
  }
  return { purgedIds };
}

/** Called by the host on a schedule (daily). Purges files older than N days. */
export async function purgeExpired(ctx: SkillContext): Promise<{ purgedIds: string[] }> {
  const { fileDays } = retentionConfig(ctx);
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - fileDays);
  const expired = await ctx.prisma.prescription.findMany({
    where: {
      fileRef: { not: null },
      starred: false,
      createdAt: { lt: cutoff },
    },
    select: { id: true, fileRef: true },
  });
  const purgedIds: string[] = [];
  for (const row of expired) {
    if (row.fileRef && ctx.callbacks.purgeUserFile) {
      await ctx.callbacks.purgeUserFile(row.fileRef).catch(() => {});
    }
    await ctx.prisma.prescription.update({
      where: { id: row.id },
      data: { fileRef: null },
    });
    purgedIds.push(row.id);
  }
  return { purgedIds };
}
