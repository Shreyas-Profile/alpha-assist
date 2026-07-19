// Layout wrapper for authed pages. Renders the sidebar on the left and the
// page content on the right. Used by /chat, /skills, /settings.

import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { isAdmin } from "@/lib/admin";
import { Sidebar } from "./sidebar";

export async function AppShell({ children }: { children: React.ReactNode }) {
  const session = await auth();
  if (!session?.user?.email) redirect("/signin");
  return (
    // flex-col on mobile so the top hamburger bar (inside Sidebar) spans
    // the full width and content sits below it. flex-row on lg+ so the
    // desktop sidebar sits on the left of the content column.
    // Without this, the mobile header was rendered as a flex ROW item and
    // stretched vertically down the full page — the "eating half the page"
    // bug Shreyas hit.
    <div className="flex flex-col lg:flex-row min-h-screen bg-background text-foreground">
      <Sidebar
        userName={session.user.name}
        userImage={session.user.image}
        isAdmin={isAdmin(session.user.email)}
      />
      <div className="flex-1 min-w-0 flex flex-col">{children}</div>
    </div>
  );
}
