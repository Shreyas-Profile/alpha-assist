// Local-dev-only backend for chat.ts. Uses Prisma + SQLite via a file on
// disk (see src/lib/db.ts). On Lambda we use src/lib/ddb.ts instead — see
// chat.ts for the switch.

import { prisma } from "@/lib/db";

const MAX_CONTEXT_MESSAGES = 20;

export async function getConversations(userEmail: string) {
  return prisma.conversation.findMany({
    where: { userId: userEmail },
    orderBy: { updatedAt: "desc" },
    select: { id: true, title: true, updatedAt: true },
  });
}

export async function getConversation(id: string, userEmail: string) {
  const conv = await prisma.conversation.findFirst({
    where: { id, userId: userEmail },
    include: {
      messages: { orderBy: { createdAt: "asc" } },
    },
  });
  return conv;
}

export async function createConversation(userEmail: string, title: string) {
  return prisma.conversation.create({
    data: {
      userId: userEmail,
      title: title.trim().slice(0, 60) || "New chat",
    },
  });
}

export async function appendMessage(
  conversationId: string,
  role: "user" | "assistant" | "system",
  content: string,
) {
  const message = await prisma.message.create({
    data: { conversationId, role, content },
  });
  await prisma.conversation.update({
    where: { id: conversationId },
    data: { updatedAt: new Date() },
  });
  return message;
}

export async function getContextMessages(conversationId: string) {
  const messages = await prisma.message.findMany({
    where: { conversationId },
    orderBy: { createdAt: "desc" },
    take: MAX_CONTEXT_MESSAGES,
    select: { role: true, content: true },
  });
  return messages.reverse();
}
