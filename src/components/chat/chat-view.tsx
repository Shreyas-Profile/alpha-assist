"use client";

// The interactive chat surface. Handles two modes:
//   - New chat: no `conversationId`. On the first successful send, the server
//     returns the new conversation id via the `x-conversation-id` header. We
//     capture it in a custom fetch and router.replace() into /chat/[id].
//   - Existing chat: `conversationId` is set. Server keeps appending messages
//     to that conversation.
//
// Client-side tool execution: any tool whose name starts with `browser_` has
// no `execute` on the server. Its tool-call streams here; we forward the call
// to the chrome-agent extension and feed the result back to the LLM via
// addToolResult so it can decide what to do next.

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { DefaultChatTransport, type UIMessage } from "ai";
import { useChat } from "@ai-sdk/react";
import { ChatMessage } from "@/components/chat/message";
import { Composer } from "@/components/chat/composer";
import { callExtension } from "@/lib/browser-bridge";

type Props = {
  conversationId?: string;
  initialMessages?: UIMessage[];
  userName?: string | null;
  userImage?: string | null;
};

export function ChatView({
  conversationId,
  initialMessages = [],
  userName,
  userImage,
}: Props) {
  const router = useRouter();
  const [input, setInput] = useState("");
  const scrollAnchorRef = useRef<HTMLDivElement>(null);

  const chat = useChat({
    messages: initialMessages,
    transport: new DefaultChatTransport({
      api: "/api/chat",
      body: conversationId ? { conversationId } : {},
      // Custom fetch to snag the x-conversation-id header on new chats.
      fetch: async (url, init) => {
        const res = await fetch(url, init);
        if (!conversationId) {
          const newId = res.headers.get("x-conversation-id");
          if (newId) {
            queueMicrotask(() => router.replace(`/chat/${newId}`));
          }
        }
        return res;
      },
    }),
    // Client-side tool execution — browser_* tools have no server-side
    // execute, so we run them here by forwarding to the extension.
    async onToolCall({ toolCall }) {
      const tc = toolCall as {
        toolCallId: string;
        toolName: string;
        input?: unknown;
        args?: unknown;
      };
      if (!tc.toolName?.startsWith("browser_")) return;
      const input = (tc.input ?? tc.args) ?? {};
      try {
        const output = await callExtension(tc.toolName, input);
        chat.addToolResult({
          tool: tc.toolName,
          toolCallId: tc.toolCallId,
          output,
        } as Parameters<typeof chat.addToolResult>[0]);
      } catch (err) {
        chat.addToolResult({
          tool: tc.toolName,
          toolCallId: tc.toolCallId,
          output: { error: err instanceof Error ? err.message : String(err) },
        } as Parameters<typeof chat.addToolResult>[0]);
      }
    },
  });

  const { messages, sendMessage, status } = chat;

  // Auto-scroll to the bottom on new content.
  useEffect(() => {
    scrollAnchorRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages]);

  function send() {
    const text = input.trim();
    if (!text) return;
    void sendMessage({ text });
    setInput("");
  }

  const isEmpty = messages.length === 0;
  const isStreaming = status === "streaming" || status === "submitted";

  return (
    <div className="flex-1 flex flex-col min-h-0">
      <div className="flex-1 overflow-y-auto">
        <div className="mx-auto max-w-3xl px-4">
          {isEmpty ? (
            <div className="min-h-[50vh] flex items-center justify-center text-center">
              <div>
                <h1 className="text-2xl font-semibold mb-2">What can I help with?</h1>
                <p className="text-sm text-muted-foreground max-w-md">
                  Ask a question, brainstorm an idea, or paste something you want
                  explained. Replies stream in as they&apos;re generated.
                </p>
              </div>
            </div>
          ) : (
            <div className="py-4 divide-y divide-border/60">
              {messages.map((m) => (
                <ChatMessage
                  key={m.id}
                  role={m.role as "user" | "assistant" | "system"}
                  parts={m.parts}
                  avatarUrl={userImage}
                  userName={userName}
                />
              ))}
            </div>
          )}
          <div ref={scrollAnchorRef} />
        </div>
      </div>

      <Composer
        value={input}
        onChange={setInput}
        onSubmit={send}
        disabled={isStreaming}
        placeholder={isStreaming ? "Assistant is typing…" : undefined}
      />
    </div>
  );
}
