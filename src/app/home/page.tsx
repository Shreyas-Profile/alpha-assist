// Dashboard for authed users. Quick actions, recent conversations, tips.

import Link from "next/link";
import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { AppShell } from "@/components/app-shell/app-shell";
import { getConversations } from "@/lib/chat";
import { isAdmin } from "@/lib/admin";

export default async function HomePage() {
  const session = await auth();
  if (!session?.user?.email) redirect("/signin");

  const convos = await getConversations(session.user.email);
  const admin = isAdmin(session.user.email);

  return (
    <AppShell>
      <main className="flex-1 overflow-y-auto">
        <div className="max-w-4xl mx-auto px-6 py-10">
          <div className="mb-10">
            <div className="text-sm text-muted-foreground">
              Welcome back{session.user.name ? `, ${session.user.name.split(" ")[0]}` : ""}.
            </div>
            <h1 className="text-3xl font-semibold tracking-tight mt-1">
              What are we working on?
            </h1>
          </div>

          {/* Quick actions */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-10">
            <QuickAction
              href="/chat"
              title="New chat"
              body="Ask anything or start a task."
            />
            <QuickAction
              href="/skills"
              title="Browse skills"
              body="See what Paperloft Assist can do."
            />
            <QuickAction
              href="/settings"
              title="Settings"
              body="Manage your account."
            />
          </div>

          {/* Recent conversations */}
          <section>
            <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground mb-4">
              Recent conversations
            </h2>
            {convos.length === 0 ? (
              <div className="p-6 rounded-xl border border-border bg-foreground/[0.02] text-sm text-muted-foreground">
                No conversations yet — <Link href="/chat" className="text-foreground underline">start one</Link>.
              </div>
            ) : (
              <div className="space-y-2">
                {convos.slice(0, 10).map((c) => (
                  <Link
                    key={c.id}
                    href={`/chat/${c.id}`}
                    className="block p-4 rounded-lg border border-border bg-foreground/[0.02] hover:bg-foreground/[0.04] transition"
                  >
                    <div className="font-medium truncate">{c.title}</div>
                    <div className="text-xs text-muted-foreground mt-1">
                      {c.updatedAt.toLocaleDateString()}
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </section>

          {admin ? (
            <div className="mt-10 p-4 rounded-lg border border-accent/40 bg-accent/[0.04] text-sm">
              <div className="text-xs uppercase tracking-wider text-accent font-semibold">
                Admin
              </div>
              <div className="mt-1">
                All skills and features unlocked — no plan limits for you.
              </div>
            </div>
          ) : null}
        </div>
      </main>
    </AppShell>
  );
}

function QuickAction({
  href,
  title,
  body,
}: {
  href: string;
  title: string;
  body: string;
}) {
  return (
    <Link
      href={href}
      className="block p-4 rounded-xl border border-border bg-foreground/[0.02] hover:bg-foreground/[0.04] transition"
    >
      <div className="font-medium">{title}</div>
      <div className="text-sm text-muted-foreground mt-1">{body}</div>
    </Link>
  );
}
