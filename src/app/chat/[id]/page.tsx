// Authed. A specific conversation. Loads history from DB (server-side),
// then hands it to ChatView which continues streaming via /api/chat.

import { notFound, redirect } from "next/navigation";
import type { UIMessage } from "ai";

import { auth } from "@/lib/auth";
import { getConversation } from "@/lib/chat";
import { ChatView } from "@/components/chat/chat-view";
import { AppShell } from "@/components/app-shell/app-shell";

export default async function ChatDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const session = await auth();
  const email = session?.user?.email;
  if (!email) redirect("/signin");

  const conv = await getConversation(id, email);
  if (!conv) notFound();

  const initialMessages: UIMessage[] = conv.messages.map((m) => ({
    id: m.id,
    role: m.role as UIMessage["role"],
    parts: [{ type: "text", text: m.content }],
  }));

  return (
    <AppShell>
      <ChatView
        conversationId={conv.id}
        initialMessages={initialMessages}
        userName={session?.user?.name}
        userImage={session?.user?.image}
      />
    </AppShell>
  );
}
