"use client";

// The interactive chat surface. Handles two modes:
//   - New chat: no `conversationId`. On the first successful send, the server
//     returns the new conversation id via the `x-conversation-id` header. We
//     capture it in a ref and update the URL bar with history.replaceState —
//     NOT router.replace, which would re-mount this component.
//   - Existing chat: `conversationId` is set from the server load.

import { useEffect, useMemo, useRef, useState } from "react";
import { DefaultChatTransport, type UIMessage } from "ai";
import { useChat } from "@ai-sdk/react";
import { ChatMessage } from "@/components/chat/message";
import { Composer } from "@/components/chat/composer";

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
  const [input, setInput] = useState("");
  const scrollAnchorRef = useRef<HTMLDivElement>(null);

  const conversationIdRef = useRef<string | undefined>(conversationId);
  useEffect(() => {
    conversationIdRef.current = conversationId;
  }, [conversationId]);

  const transport = useMemo(
    () =>
      new DefaultChatTransport({
        api: "/api/chat",
        prepareSendMessagesRequest: ({ messages }) => ({
          body: {
            conversationId: conversationIdRef.current,
            messages,
          },
        }),
        fetch: async (url, init) => {
          const res = await fetch(url, init);
          const newId = res.headers.get("x-conversation-id");
          if (newId && !conversationIdRef.current) {
            conversationIdRef.current = newId;
            if (typeof window !== "undefined") {
              window.history.replaceState(null, "", `/chat/${newId}`);
            }
          }
          return res;
        },
      }),
    [],
  );

  const chat = useChat({
    messages: initialMessages,
    transport,
  });

  const { messages, sendMessage, status } = chat;

  useEffect(() => {
    scrollAnchorRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages]);

  function send(extra?: { attachedDoc?: { docId: string; filename: string; status: string } }) {
    const attached = extra?.attachedDoc;
    const userText = input.trim();
    if (!userText && !attached) return;
    // Prepend a compact attachment marker so the LLM knows the doc exists +
    // its status. It should poll docs_get({id}) until ready, then use
    // docs_search on it. If the user typed nothing, we still send with just
    // the marker — a common "here, remember this" pattern.
    const finalText = attached
      ? `[Attached: ${attached.filename} · docId=${attached.docId} · status=${attached.status}. Ingest usually completes in 10-60s — poll docs_get if you need to search it now.]${userText ? "\n\n" + userText : ""}`
      : userText;
    void sendMessage({ text: finalText });
    setInput("");
  }

  const isEmpty = messages.length === 0;
  const isStreaming = status === "streaming" || status === "submitted";

  return (
    <div className="flex-1 flex flex-col min-h-0">
      <div className="flex-1 overflow-y-auto">
        <div className="mx-auto max-w-3xl px-4">
          {isEmpty ? (
            <div className="min-h-[70vh] flex items-center justify-center py-8">
              <div className="w-full max-w-xl space-y-6 text-left">
                <div className="text-center">
                  <h1 className="text-2xl font-semibold mb-2">
                    Hey — I&apos;m Paperloft.
                  </h1>
                  <p className="text-sm text-muted-foreground">
                    Ask me anything. Replies stream in as they&apos;re generated.
                  </p>
                </div>

                <div className="rounded-lg border border-border/60 bg-foreground/[0.02] p-4 space-y-2">
                  <div className="text-[11px] uppercase tracking-widest text-accent font-semibold">
                    What I can do
                  </div>
                  <ul className="text-sm text-muted-foreground space-y-1.5">
                    <li>⏰ <span className="text-foreground">Set reminders + medication schedules</span> — <em>&quot;remind me to call mum at 8pm&quot;</em></li>
                    <li>💊 <span className="text-foreground">Read a prescription</span> — send a photo or text and I&apos;ll schedule the meds</li>
                    <li>🌐 <span className="text-foreground">Browse real websites</span> — flights, prices, jobs, forms</li>
                    <li>📎 <span className="text-foreground">Read your documents</span> — attach a PDF and ask questions (page-cited)</li>
                    <li>⏱️ <span className="text-foreground">Schedule prompts on cron</span> — &quot;every Monday at 9am, summarise my week&quot;</li>
                    <li>🧅 <span className="text-foreground">Fetch through Tor</span> when you want an anonymous request</li>
                  </ul>
                </div>

                <div className="rounded-lg border border-accent/30 bg-accent/5 p-4 text-sm">
                  <div className="text-[11px] uppercase tracking-widest text-accent font-semibold mb-1">
                    Two ways to reach me
                  </div>
                  <p className="text-muted-foreground">
                    Chat here in your browser, or message me on{" "}
                    <span className="text-foreground font-medium">WhatsApp</span> —
                    the OTP number I texted you (<span className="font-mono">+91 8660149805</span>).
                    Replies, ack buttons on reminders, and prescription photos all work the same way over there.
                    You can also link{" "}
                    <a href="/skills" className="underline hover:text-foreground">Telegram</a>
                    {" "}from the Skills page.
                  </p>
                </div>

                <p className="text-xs text-muted-foreground text-center">
                  Type your first message below to get started ↓
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
