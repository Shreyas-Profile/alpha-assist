// User settings. Right now: profile info + plan info + connected accounts
// placeholders (LinkedIn/Google Calendar/etc. wire up as they ship).

import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { AppShell } from "@/components/app-shell/app-shell";
import { isAdmin } from "@/lib/admin";
import { getIntegration } from "@/lib/integrations";

export default async function SettingsPage({
  searchParams,
}: {
  searchParams: Promise<{ linkedin_connected?: string; linkedin_error?: string }>;
}) {
  const session = await auth();
  const user = session?.user;
  if (!user?.email) redirect("/signin");
  const admin = isAdmin(user.email);
  const sp = await searchParams;
  const linkedIn = await getIntegration(user.email, "linkedin");
  const linkedInConnected = !!linkedIn && linkedIn.expiresAt > Date.now();

  return (
    <AppShell>
      <main className="flex-1 overflow-y-auto">
        <div className="max-w-3xl mx-auto px-6 py-10 space-y-10">
          <div>
            <div className="text-xs uppercase tracking-widest text-accent font-semibold">
              Settings
            </div>
            <h1 className="text-3xl font-semibold tracking-tight mt-2">Your account</h1>
          </div>

          {/* Profile */}
          <section className="p-6 rounded-xl border border-border bg-foreground/[0.02]">
            <h2 className="font-semibold mb-4">Profile</h2>
            <div className="flex items-center gap-4">
              {user.image ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={user.image}
                  alt={user.name ?? "you"}
                  className="w-14 h-14 rounded-full border border-border"
                />
              ) : (
                <div className="w-14 h-14 rounded-full bg-foreground/10 flex items-center justify-center text-lg font-semibold">
                  {user.name?.[0]?.toUpperCase() ?? "U"}
                </div>
              )}
              <div>
                <div className="font-medium">{user.name ?? "You"}</div>
                <div className="text-sm text-muted-foreground">{user.email}</div>
              </div>
            </div>
            <p className="text-xs text-muted-foreground mt-4">
              Profile is read from your Google account. Update it there to update it here.
            </p>
          </section>

          {/* Plan */}
          <section className="p-6 rounded-xl border border-border bg-foreground/[0.02]">
            <h2 className="font-semibold mb-4">Plan</h2>
            {admin ? (
              <div>
                <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-full bg-accent/10 border border-accent/30 text-accent text-xs font-semibold">
                  Admin — all skills, no limits
                </div>
                <p className="text-sm text-muted-foreground mt-3">
                  Every skill is unlocked. You skip pricing gates and rate limits.
                </p>
              </div>
            ) : (
              <div>
                <div className="text-sm">
                  <span className="font-medium">Beta</span> — all features free while we build.
                </div>
                <p className="text-sm text-muted-foreground mt-2">
                  When paid tiers launch, existing users lock in the beta price for life.
                </p>
              </div>
            )}
          </section>

          {/* Connected accounts */}
          <section className="p-6 rounded-xl border border-border bg-foreground/[0.02]">
            <h2 className="font-semibold mb-4">Connected accounts</h2>

            {sp.linkedin_connected ? (
              <div className="mb-4 p-3 rounded-md bg-emerald-500/10 border border-emerald-500/30 text-sm text-emerald-700 dark:text-emerald-400">
                LinkedIn connected. You can now ask Paperloft Assist to post on your behalf.
              </div>
            ) : null}
            {sp.linkedin_error ? (
              <div className="mb-4 p-3 rounded-md bg-red-500/10 border border-red-500/30 text-sm text-red-700 dark:text-red-400">
                LinkedIn connect failed: {decodeURIComponent(sp.linkedin_error)}
              </div>
            ) : null}

            <div className="space-y-3 text-sm">
              <ConnectRow name="Google" status="Connected" note="For sign-in and profile." />
              <ConnectRow
                name="LinkedIn"
                status={linkedInConnected ? "Connected" : "Not connected"}
                note={
                  linkedInConnected
                    ? "Paperloft Assist can post text updates to your feed."
                    : "Needed for the LinkedIn posting skill."
                }
                action={linkedInConnected ? undefined : "Connect"}
                href={linkedInConnected ? undefined : "/api/linkedin/connect"}
              />
              <ConnectRow name="Google Calendar" status="Not connected" note="Read free slots, draft invites." action="Connect" disabled />
              <ConnectRow name="GitHub" status="Not connected" note="Read repos, open issues." action="Connect" disabled />
            </div>
          </section>

          {/* Danger zone */}
          <section className="p-6 rounded-xl border border-red-500/30 bg-red-500/[0.03]">
            <h2 className="font-semibold mb-2 text-red-600 dark:text-red-400">Danger zone</h2>
            <p className="text-sm text-muted-foreground mb-4">
              Delete your account and all associated data. Cannot be undone.
            </p>
            <button
              type="button"
              disabled
              className="px-4 py-2 rounded-md border border-red-500/40 text-red-600 dark:text-red-400 text-sm font-medium hover:bg-red-500/10 transition disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Delete my account (coming soon)
            </button>
          </section>
        </div>
      </main>
    </AppShell>
  );
}

function ConnectRow({
  name,
  status,
  note,
  action,
  href,
  disabled,
}: {
  name: string;
  status: string;
  note: string;
  action?: string;
  href?: string;
  disabled?: boolean;
}) {
  const label = disabled ? "Coming soon" : action;
  const btnClass =
    "text-xs px-3 py-1.5 rounded-md border border-border hover:bg-foreground/5 transition disabled:opacity-50 disabled:cursor-not-allowed";
  return (
    <div className="flex items-center justify-between gap-3 py-2">
      <div>
        <div className="font-medium">{name}</div>
        <div className="text-xs text-muted-foreground">{note}</div>
      </div>
      {action && !disabled && href ? (
        <a href={href} className={btnClass}>{label}</a>
      ) : action ? (
        <button type="button" disabled={disabled} className={btnClass}>{label}</button>
      ) : (
        <div className="text-xs text-accent font-medium">{status}</div>
      )}
    </div>
  );
}
