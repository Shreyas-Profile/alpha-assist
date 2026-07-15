"use client";

// Persistent left sidebar shown on every authed page (chat, skills, settings).
// Collapses to icons on medium screens, hidden on mobile in favour of a header
// menu (TODO — for now it's just always shown on md+).

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, MessageSquare, Sparkles, Settings, LogOut } from "lucide-react";
import { signOut } from "next-auth/react";
import { cn } from "@/lib/utils";

type NavItem = {
  href: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
};

const PRIMARY: NavItem[] = [
  { href: "/home", label: "Home", icon: Home },
  { href: "/chat", label: "Chat", icon: MessageSquare },
  { href: "/skills", label: "Skills", icon: Sparkles },
];

const BOTTOM: NavItem[] = [
  { href: "/settings", label: "Settings", icon: Settings },
];

export function Sidebar({
  userName,
  userImage,
  isAdmin,
}: {
  userName?: string | null;
  userImage?: string | null;
  isAdmin?: boolean;
}) {
  const pathname = usePathname();
  return (
    <aside className="hidden md:flex md:w-56 shrink-0 border-r border-border/50 bg-foreground/[0.02] flex-col h-screen sticky top-0">
      <div className="px-4 py-4 border-b border-border/50">
        <Link href="/home" className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-md bg-foreground text-background flex items-center justify-center text-sm font-bold">
            P
          </div>
          <span className="font-semibold">Paperloft Assist</span>
        </Link>
      </div>

      <nav className="flex-1 flex flex-col p-2 gap-1">
        {PRIMARY.map((item) => (
          <NavLink key={item.href} item={item} active={isActive(pathname, item.href)} />
        ))}
      </nav>

      <div className="p-2 border-t border-border/50 space-y-1">
        {BOTTOM.map((item) => (
          <NavLink key={item.href} item={item} active={isActive(pathname, item.href)} />
        ))}

        <div className="px-2 py-2 mt-2 flex items-center gap-2">
          {userImage ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={userImage}
              alt={userName ?? "user"}
              className="w-7 h-7 rounded-full border border-border shrink-0"
            />
          ) : (
            <div className="w-7 h-7 rounded-full bg-foreground/10 flex items-center justify-center text-xs font-semibold shrink-0">
              {userName?.[0]?.toUpperCase() ?? "U"}
            </div>
          )}
          <div className="min-w-0 flex-1">
            <div className="text-xs font-medium truncate">{userName ?? "You"}</div>
            {isAdmin ? (
              <div className="text-[10px] uppercase tracking-wider text-accent font-semibold">
                Admin
              </div>
            ) : (
              <div className="text-[10px] text-muted-foreground">Free plan</div>
            )}
          </div>
          <button
            type="button"
            onClick={() => signOut({ callbackUrl: "/" })}
            title="Sign out"
            className="p-1.5 rounded-md hover:bg-foreground/10 transition text-muted-foreground hover:text-foreground"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>
    </aside>
  );
}

function NavLink({ item, active }: { item: NavItem; active: boolean }) {
  const Icon = item.icon;
  return (
    <Link
      href={item.href}
      className={cn(
        "flex items-center gap-3 px-3 py-2 rounded-md text-sm transition",
        active
          ? "bg-foreground/10 text-foreground font-medium"
          : "text-muted-foreground hover:bg-foreground/5 hover:text-foreground",
      )}
    >
      <Icon className="w-4 h-4 shrink-0" />
      <span>{item.label}</span>
    </Link>
  );
}

function isActive(pathname: string, href: string): boolean {
  if (href === "/home") return pathname === "/home";
  if (href === "/chat") return pathname === "/chat" || pathname.startsWith("/chat/");
  return pathname.startsWith(href);
}
