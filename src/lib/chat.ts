// Server-side chat data access — Prisma / Postgres.
// Signatures match the old DynamoDB adapter (`src/lib/ddb.ts`) so the API
// routes need zero changes.

import { prisma } from "./db";

function newId(prefix: string) {
  // cuid-like but zero-dep: base36 timestamp + random suffix
  return (
    prefix +
    Date.now().toString(36) +
    Math.random().toString(36).slice(2, 10)
  );
}

export async function getConversations(userEmail: string) {
  const rows = await prisma.conversation.findMany({
    where: { userEmail },
    orderBy: { updatedAt: "desc" },
    take: 100,
    select: { id: true, title: true, updatedAt: true },
  });
  return rows;
}

export async function createConversation(userEmail: string, title: string) {
  const id = newId("c_");
  const cleanTitle = title.trim().slice(0, 60) || "New chat";
  await prisma.conversation.create({
    data: { id, userEmail, title: cleanTitle },
  });
  return { id, title: cleanTitle, userId: userEmail };
}

export async function getConversation(id: string, userEmail: string) {
  const conv = await prisma.conversation.findFirst({
    where: { id, userEmail },
    include: {
      messages: {
        orderBy: { createdAt: "asc" },
        select: { id: true, role: true, content: true, createdAt: true, conversationId: true },
      },
    },
  });
  if (!conv) return null;
  return {
    id: conv.id,
    title: conv.title,
    userId: conv.userEmail,
    createdAt: conv.createdAt,
    updatedAt: conv.updatedAt,
    messages: conv.messages.map((m) => ({
      id: m.id,
      role: m.role as "user" | "assistant" | "system",
      content: m.content,
      createdAt: m.createdAt,
      conversationId: m.conversationId,
    })),
  };
}

export async function appendMessage(
  conversationId: string,
  role: "user" | "assistant" | "system",
  content: string,
) {
  const id = newId("m_");
  const now = new Date();
  const [msg] = await prisma.$transaction([
    prisma.message.create({
      data: { id, conversationId, role, content, createdAt: now },
    }),
    // Bump the conversation's updatedAt so it floats to the top of the
    // history list. @updatedAt handles this automatically on any write to
    // the row — this update just touches a field to trigger it.
    prisma.conversation.update({
      where: { id: conversationId },
      data: { updatedAt: now },
    }),
  ]);
  return {
    id: msg.id,
    role: msg.role as "user" | "assistant" | "system",
    content: msg.content,
    createdAt: msg.createdAt,
    conversationId: msg.conversationId,
  };
}

export async function getContextMessages(conversationId: string) {
  const rows = await prisma.message.findMany({
    where: { conversationId },
    orderBy: { createdAt: "desc" },
    take: 20,
    select: { role: true, content: true },
  });
  return rows
    .map((m) => ({ role: m.role as "user" | "assistant" | "system", content: m.content }))
    .reverse();
}
