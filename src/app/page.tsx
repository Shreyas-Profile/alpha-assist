// Landing page. Public. Shows the pitch and a "Sign in with Google" button.
// After sign-in the user lands on /chat (see redirect in the sign-in action).

import Link from "next/link";
import { auth, signIn } from "@/lib/auth";
import { redirect } from "next/navigation";

export default async function LandingPage() {
  const session = await auth();
  // Already signed in? Skip the landing pitch.
  if (session?.user) redirect("/chat");

  return (
    <main className="min-h-screen flex items-center justify-center px-6">
      <div className="max-w-lg w-full space-y-8 text-center">
        <div className="space-y-3">
          <h1 className="text-4xl font-semibold tracking-tight">Alpha Assist</h1>
          <p className="text-muted-foreground text-lg">
            A general-purpose AI assistant with pluggable skills, chat history,
            and document uploads. Built with a human-in-the-loop philosophy.
          </p>
        </div>

        <form
          action={async () => {
            "use server";
            await signIn("google", { redirectTo: "/chat" });
          }}
        >
          <button
            type="submit"
            className="inline-flex items-center gap-3 px-6 py-3 rounded-lg border border-border bg-foreground text-background font-medium hover:opacity-90 transition"
          >
            <GoogleGlyph />
            Sign in with Google
          </button>
        </form>

        <p className="text-xs text-muted-foreground">
          Only your email and profile info are read from Google. No spam, ever.{" "}
          <Link
            href="https://github.com/Shreyas-Profile/alpha-assist"
            className="underline hover:text-foreground"
          >
            Source
          </Link>
        </p>
      </div>
    </main>
  );
}

function GoogleGlyph() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true">
      <path
        fill="currentColor"
        d="M12 10.2v3.9h5.5c-.24 1.5-1.7 4.4-5.5 4.4-3.3 0-6-2.7-6-6.1s2.7-6.1 6-6.1c1.9 0 3.1.8 3.8 1.5l2.6-2.5C16.7 3.7 14.6 2.8 12 2.8c-5 0-9.1 4.1-9.1 9.2s4.1 9.2 9.1 9.2c5.3 0 8.8-3.7 8.8-8.9 0-.6-.1-1.1-.2-1.6H12z"
      />
    </svg>
  );
}
