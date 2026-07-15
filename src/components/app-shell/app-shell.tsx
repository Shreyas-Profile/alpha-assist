// Layout wrapper for authed pages. Renders the sidebar on the left and the
// page content on the right. Used by /home, /chat, /skills, /settings.

import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { isAdmin } from "@/lib/admin";
import { Sidebar } from "./sidebar";

export async function AppShell({ children }: { children: React.ReactNode }) {
  const session = await auth();
  if (!session?.user?.email) redirect("/signin");
  return (
    <div className="flex min-h-screen bg-background text-foreground">
      <Sidebar
        userName={session.user.name}
        userImage={session.user.image}
        isAdmin={isAdmin(session.user.email)}
      />
      <div className="flex-1 min-w-0 flex flex-col">{children}</div>
    </div>
  );
}
