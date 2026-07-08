// POST /api/chat — streaming endpoint.
//
// Flow per request:
//   1. Verify session (email required).
//   2. If no conversationId in the body → create a new Conversation row, using the
//      first user message as the title.
//   3. Extract the *last* user message from the body's UI messages, persist it.
//   4. Load the last N messages of that conversation (context window cap).
//   5. Stream from OpenRouter.
//   6. In onFinish, persist the assistant's full reply.
//   7. Send the UIMessageStream back with x-conversation-id set so the client
//      knows what to navigate to on first send.

import { NextResponse } from "next/server";
import { convertToModelMessages, stepCountIs, streamText, type UIMessage } from "ai";

import { auth } from "@/lib/auth";
import {
  appendMessage,
  createConversation,
  getContextMessages,
} from "@/lib/chat";
import { CHAT_MODEL, SYSTEM_PROMPT, openrouter } from "@/lib/openrouter";
import { skills } from "@/lib/skills";

export const runtime = "nodejs"; // Prisma + better-sqlite3 need Node runtime, not Edge.
export const maxDuration = 60;

function extractText(message: UIMessage): string {
  // UIMessage.parts is an array; grab the concatenated text of any text parts.
  return message.parts
    .filter((p): p is { type: "text"; text: string } => p.type === "text")
    .map((p) => p.text)
    .join("");
}

export async function POST(req: Request) {
  const session = await auth();
  const email = session?.user?.email;
  if (!email) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const body = (await req.json()) as {
    conversationId?: string;
    messages: UIMessage[];
  };
  const uiMessages = body.messages ?? [];
  const lastUserMessage = [...uiMessages].reverse().find((m) => m.role === "user");
  if (!lastUserMessage) {
    return NextResponse.json({ error: "no user message" }, { status: 400 });
  }
  const lastUserText = extractText(lastUserMessage);

  // Ensure we have a conversation to attach messages to.
  let conversationId = body.conversationId;
  if (!conversationId) {
    const created = await createConversation(email, lastUserText);
    conversationId = created.id;
  }

  // Persist the incoming user message before we call the LLM — that way if the
  // model call fails, the user's text isn't lost.
  await appendMessage(conversationId, "user", lastUserText);

  // Build the message array for the LLM: last N messages of persisted history,
  // fed as model messages. System prompt is set via `system` on streamText below.
  const historyRows = await getContextMessages(conversationId);
  const historyAsUiMessages: UIMessage[] = historyRows.map((row, i) => ({
    id: `hist-${i}`,
    role: row.role as UIMessage["role"],
    parts: [{ type: "text", text: row.content }],
  }));

  const result = streamText({
    // .chat() forces the classic /v1/chat/completions endpoint. Without it,
    // @ai-sdk/openai defaults to OpenAI's newer /v1/responses API, which
    // OpenRouter doesn't implement for most models (including DeepSeek).
    model: openrouter.chat(CHAT_MODEL),
    system: SYSTEM_PROMPT,
    messages: await convertToModelMessages(historyAsUiMessages),
    // Skills the LLM can invoke via tool-calling. Each returns data the model
    // then reads in a follow-up step.
    tools: skills,
    // Allow up to 5 model steps per turn — the LLM may call a tool, read the
    // result, and reply. Without this it'd stop after one step.
    stopWhen: stepCountIs(5),
    onFinish: async ({ text }) => {
      // Only the final assistant text is persisted. Tool calls and their
      // results are transient — they're visible during streaming but not
      // stored, so refreshing shows the answer, not the plumbing.
      if (text) await appendMessage(conversationId!, "assistant", text);
    },
  });

  return result.toUIMessageStreamResponse({
    headers: {
      "x-conversation-id": conversationId,
    },
  });
}
