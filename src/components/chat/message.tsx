"use client";

// One chat message bubble. Renders each `part` of a UIMessage appropriately:
//   - text: assistant → markdown via streamdown, user → plain text
//   - tool-* / dynamic-tool: a small "used a skill" badge so the user sees
//     what the assistant did before its reply

import { Loader2, Search } from "lucide-react";
import { Streamdown } from "streamdown";
import type { UIMessage } from "ai";
import { cn } from "@/lib/utils";

type Part = UIMessage["parts"][number];

type Props = {
  role: "user" | "assistant" | "system";
  parts: Part[];
  avatarUrl?: string | null;
  userName?: string | null;
};

export function ChatMessage({ role, parts, avatarUrl, userName }: Props) {
  if (role === "system") return null; // never render system prompts

  const isUser = role === "user";
  // For user turns just concatenate text — users don't emit tool calls.
  const userText = parts
    .filter((p): p is Extract<Part, { type: "text" }> => p.type === "text")
    .map((p) => p.text)
    .join("");

  return (
    <div className="flex gap-3 py-4">
      <Avatar isUser={isUser} avatarUrl={avatarUrl} userName={userName} />
      <div className="flex-1 min-w-0 space-y-2">
        <div className="text-xs font-medium text-muted-foreground">
          {isUser ? userName ?? "You" : "Alpha Assist"}
        </div>

        {isUser ? (
          <p className="whitespace-pre-wrap">{userText}</p>
        ) : (
          <div className="space-y-2">
            {parts.map((part, i) => renderAssistantPart(part, i))}
          </div>
        )}
      </div>
    </div>
  );
}

function renderAssistantPart(part: Part, key: number) {
  // Tool parts. AI SDK v5+ uses either `dynamic-tool` (for tools registered at
  // runtime) or `tool-<toolName>` (for statically-known tools). Match both.
  if (part.type === "dynamic-tool" || part.type.startsWith("tool-")) {
    return <ToolCall key={key} part={part as ToolPart} />;
  }

  if (part.type === "text") {
    return (
      <div
        key={key}
        className={cn(
          "prose prose-sm max-w-none dark:prose-invert",
          "prose-p:my-2 prose-pre:my-2 prose-headings:mt-3 prose-headings:mb-2",
          "prose-code:before:content-none prose-code:after:content-none",
          "prose-code:bg-foreground/10 prose-code:px-1 prose-code:py-0.5 prose-code:rounded prose-code:text-[0.85em]",
          "prose-pre:bg-foreground/5 prose-pre:border prose-pre:border-border",
        )}
      >
        <Streamdown>{part.text}</Streamdown>
      </div>
    );
  }

  // Silently ignore other part types (reasoning, source, file) for now.
  return null;
}

// Loose type — different part flavours have overlapping fields; we only read
// a couple.
type ToolPart = {
  type: string;
  toolName?: string;
  state?: "input-streaming" | "input-available" | "output-available" | "output-error";
  input?: unknown;
  output?: unknown;
  errorText?: string;
};

function ToolCall({ part }: { part: ToolPart }) {
  const toolName =
    part.toolName ??
    (part.type.startsWith("tool-") ? part.type.slice("tool-".length) : "tool");
  const done = part.state === "output-available";
  const errored = part.state === "output-error";
  const query = typeof part.input === "object" && part.input !== null
    ? (part.input as { query?: string }).query
    : undefined;

  return (
    <div className="inline-flex items-center gap-2 text-xs rounded-md border border-border bg-foreground/[0.03] px-2.5 py-1.5 max-w-full">
      {done || errored ? (
        <Search className="h-3.5 w-3.5 shrink-0" />
      ) : (
        <Loader2 className="h-3.5 w-3.5 shrink-0 animate-spin" />
      )}
      <span className="font-medium">
        {errored ? "Skill failed" : done ? "Skill used" : "Using skill"}
      </span>
      <span className="text-muted-foreground truncate">
        <code className="font-mono">{toolName}</code>
        {query ? <> — {query}</> : null}
      </span>
    </div>
  );
}

function Avatar({
  isUser,
  avatarUrl,
  userName,
}: {
  isUser: boolean;
  avatarUrl?: string | null;
  userName?: string | null;
}) {
  const size = "h-7 w-7";
  if (isUser && avatarUrl) {
    // eslint-disable-next-line @next/next/no-img-element
    return (
      <img
        src={avatarUrl}
        alt={userName ?? "user"}
        className={cn(size, "rounded-full border border-border shrink-0")}
      />
    );
  }
  return (
    <div
      className={cn(
        size,
        "rounded-full shrink-0 flex items-center justify-center text-xs font-semibold",
        isUser
          ? "bg-foreground/10 text-foreground"
          : "bg-accent text-background",
      )}
    >
      {isUser ? (userName?.[0]?.toUpperCase() ?? "U") : "A"}
    </div>
  );
}
