// Handle a plain-text message from a linked Telegram user.
//
// Called by the bot webhook when the message is not a slash-command. We
// resolve chatId → userEmail via telegram_links, load the last N messages
// of a dedicated Telegram conversation, call the LLM, persist both sides,
// and return the reply text so the webhook can send it back via the bot.
//
// Deliberately minimal for now:
//   - no tool-calling (skills stay on the web chat surface)
//   - one conversation per Telegram chat, keyed by chatId
//   - short reply (Telegram's own limit is 4096 chars; we cap earlier)

import { generateText, type ModelMessage } from "ai";
import { prisma } from "./db";
import { CHAT_MODEL, SYSTEM_PROMPT, openrouter } from "./openrouter";
import { appendMessage } from "./chat";

const HISTORY_LIMIT = 20;
const TELEGRAM_MAX_CHARS = 4000; // Telegram's cap is 4096, leave headroom.

const CONNECT_HINT =
  "You're not linked to a Paperloft account yet.\n\n" +
  "Open https://paperloft.uk/settings and hit 'Connect Telegram bot' to link this chat to your account. Then message me here and I'll reply as your assistant.";

export async function handleTelegramMessage(
  chatId: string,
  userText: string,
): Promise<string> {
  const link = await prisma.telegramLink.findFirst({ where: { chatId } });
  if (!link) return CONNECT_HINT;

  const convId = `tg_${chatId}`;
  const existing = await prisma.conversation.findUnique({ where: { id: convId } });
  if (!existing) {
    await prisma.conversation.create({
      data: {
        id: convId,
        userEmail: link.userEmail,
        title: `Telegram · ${link.firstName ?? link.username ?? chatId}`,
      },
    });
  }

  await appendMessage(convId, "user", userText);

  const history = await prisma.message.findMany({
    where: { conversationId: convId },
    orderBy: { createdAt: "asc" },
    take: HISTORY_LIMIT,
    select: { role: true, content: true },
  });

  const messages: ModelMessage[] = history.map((m) => ({
    role: m.role as "user" | "assistant" | "system",
    content: m.content,
  }));

  let reply: string;
  try {
    const result = await generateText({
      model: openrouter.chat(CHAT_MODEL),
      system: SYSTEM_PROMPT,
      messages,
    });
    reply = result.text.trim() || "(no reply)";
  } catch (err) {
    console.error("[telegram-chat] generateText threw:", err);
    return "Something broke on my end. Try again in a moment.";
  }

  if (reply.length > TELEGRAM_MAX_CHARS) {
    reply = reply.slice(0, TELEGRAM_MAX_CHARS) + "\n\n(truncated)";
  }
  await appendMessage(convId, "assistant", reply);
  return reply;
}
