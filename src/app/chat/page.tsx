// Authed chat page. Middleware already gates this route, but we still call auth()
// here so we can render the user's name/avatar in the top bar.

import { auth, signOut } from "@/lib/auth";

export default async function ChatPage() {
  const session = await auth();
  const user = session?.user;

  return (
    <div className="min-h-screen flex flex-col">
      <header className="border-b border-border">
        <div className="mx-auto max-w-5xl px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="font-semibold">Alpha Assist</span>
            <span className="text-xs text-muted-foreground rounded-full border border-border px-2 py-0.5">
              M1 — scaffolded
            </span>
          </div>
          <div className="flex items-center gap-3">
            {user?.image && (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={user.image}
                alt={user.name ?? "user"}
                className="w-7 h-7 rounded-full border border-border"
              />
            )}
            <span className="text-sm">{user?.name}</span>
            <form
              action={async () => {
                "use server";
                await signOut({ redirectTo: "/" });
              }}
            >
              <button
                type="submit"
                className="text-sm text-muted-foreground hover:text-foreground transition"
              >
                Sign out
              </button>
            </form>
          </div>
        </div>
      </header>

      <main className="flex-1 flex items-center justify-center px-6">
        <div className="max-w-md text-center space-y-3">
          <h1 className="text-2xl font-semibold">You&apos;re signed in.</h1>
          <p className="text-muted-foreground">
            The chat UI, streaming, and skills marketplace land in the next milestones.
            This page confirms auth works end-to-end.
          </p>
        </div>
      </main>
    </div>
  );
}
