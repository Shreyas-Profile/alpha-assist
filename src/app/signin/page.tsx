// Dedicated sign-in page (Auth.js redirects here when someone hits a protected
// route without a session). Same UI as the landing sign-in.

import { signIn, auth } from "@/lib/auth";
import { redirect } from "next/navigation";

export default async function SignInPage({
  searchParams,
}: {
  searchParams: Promise<{ callbackUrl?: string }>;
}) {
  const session = await auth();
  if (session?.user) redirect("/chat");
  const { callbackUrl = "/chat" } = await searchParams;

  return (
    <main className="min-h-screen flex items-center justify-center px-6">
      <div className="max-w-sm w-full space-y-6 text-center">
        <h1 className="text-2xl font-semibold">Sign in</h1>
        <p className="text-muted-foreground text-sm">
          Alpha Assist uses Google for sign-in. Only your email and profile info are read.
        </p>
        <form
          action={async () => {
            "use server";
            await signIn("google", { redirectTo: callbackUrl });
          }}
        >
          <button
            type="submit"
            className="w-full px-4 py-2.5 rounded-lg border border-border bg-foreground text-background font-medium hover:opacity-90 transition"
          >
            Continue with Google
          </button>
        </form>
      </div>
    </main>
  );
}
