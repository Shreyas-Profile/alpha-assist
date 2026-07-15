// Per-user third-party integration tokens — Prisma / Postgres backed.
// Keyed by (userEmail, provider). data is a JSON blob shaped by the provider.

import { prisma } from "./db";

export type LinkedInIntegration = {
  provider: "linkedin";
  accessToken: string;
  refreshToken?: string;
  expiresAt: number; // unix ms
  personUrn: string;
  scopes: string[];
};

export type TelegramIntegration = {
  provider: "telegram";
  chatId: number;
};

export type WhatsAppIntegration = {
  provider: "whatsapp";
  phone: string; // E.164 format, e.g. "+447700900123"
};

export type Integration = LinkedInIntegration | TelegramIntegration | WhatsAppIntegration;

export async function saveIntegration(
  userEmail: string,
  integration: Integration,
): Promise<void> {
  await prisma.integration.upsert({
    where: { userEmail_provider: { userEmail, provider: integration.provider } },
    create: {
      userEmail,
      provider: integration.provider,
      data: integration as unknown as object,
    },
    update: {
      data: integration as unknown as object,
    },
  });
}

export async function getIntegration<T extends Integration["provider"]>(
  userEmail: string,
  provider: T,
): Promise<Extract<Integration, { provider: T }> | null> {
  const row = await prisma.integration.findUnique({
    where: { userEmail_provider: { userEmail, provider } },
  });
  if (!row) return null;
  return row.data as unknown as Extract<Integration, { provider: T }>;
}

export async function removeIntegration(
  userEmail: string,
  provider: Integration["provider"],
): Promise<void> {
  await prisma.integration
    .delete({
      where: { userEmail_provider: { userEmail, provider } },
    })
    .catch(() => undefined);
}

export async function findUserByTelegramChatId(chatId: number): Promise<string | null> {
  const row = await prisma.telegramChatMap.findUnique({
    where: { chatId: BigInt(chatId) },
    select: { userEmail: true },
  });
  return row?.userEmail ?? null;
}

// Also write an inverse-lookup row so findUserByTelegramChatId is a single
// indexed query rather than a scan of the Integration table.
export async function saveTelegramIntegration(userEmail: string, chatId: number): Promise<void> {
  await saveIntegration(userEmail, { provider: "telegram", chatId });
  await prisma.telegramChatMap.upsert({
    where: { chatId: BigInt(chatId) },
    create: { chatId: BigInt(chatId), userEmail },
    update: { userEmail },
  });
}
