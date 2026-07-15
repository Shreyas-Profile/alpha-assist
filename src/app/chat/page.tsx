// Authed. Empty state — no conversation open yet. First message the user sends
// creates the conversation server-side; ChatView redirects to /chat/[id].

import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { ChatView } from "@/components/chat/chat-view";
import { AppShell } from "@/components/app-shell/app-shell";

export default async function ChatIndexPage() {
  const session = await auth();
  const user = session?.user;
  if (!user?.email) redirect("/signin");

  return (
    <AppShell>
      <ChatView userName={user.name} userImage={user.image} />
    </AppShell>
  );
}
