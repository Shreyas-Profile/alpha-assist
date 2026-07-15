// Public landing page for Paperloft Assist. Anyone visiting the root URL sees
// this — signed-in users are redirected straight to /chat.
//
// Sections (top → bottom):
//   1. Nav — logo left, "Sign in" / "Get started" right
//   2. Hero — headline, subtext, CTA
//   3. Features — 4 cards, 2×2 grid
//   4. How it works — 3 numbered steps
//   5. Pricing — 3 tiers (cosmetic, no live billing wired up yet)
//   6. FAQ — 5 questions
//   7. Contact + footer — email, links, copyright

import Link from "next/link";
import { auth, signIn } from "@/lib/auth";
import { redirect } from "next/navigation";

export default async function LandingPage() {
  const session = await auth();
  if (session?.user) redirect("/chat");

  return (
    <main className="min-h-screen bg-background text-foreground">
      <Nav />
      <Hero />
      <Features />
      <HowItWorks />
      <Pricing />
      <Faq />
      <Contact />
      <Footer />
    </main>
  );
}

// ---- Nav -------------------------------------------------------------------

function Nav() {
  return (
    <nav className="sticky top-0 z-30 backdrop-blur-md bg-background/70 border-b border-border/50">
      <div className="mx-auto max-w-6xl px-6 py-4 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2 font-semibold">
          <LogoMark />
          <span>Paperloft Assist</span>
        </Link>

        <div className="flex items-center gap-3">
          <a
            href="#pricing"
            className="hidden sm:inline text-sm text-muted-foreground hover:text-foreground transition"
          >
            Pricing
          </a>
          <a
            href="#faq"
            className="hidden sm:inline text-sm text-muted-foreground hover:text-foreground transition"
          >
            FAQ
          </a>
          <form
            action={async () => {
              "use server";
              await signIn("google", { redirectTo: "/chat" });
            }}
          >
            <button
              type="submit"
              className="text-sm px-3 py-1.5 rounded-md border border-border hover:bg-foreground/5 transition"
            >
              Log in
            </button>
          </form>
          <form
            action={async () => {
              "use server";
              await signIn("google", { redirectTo: "/chat" });
            }}
          >
            <button
              type="submit"
              className="text-sm px-3 py-1.5 rounded-md bg-foreground text-background font-medium hover:opacity-90 transition"
            >
              Sign up
            </button>
          </form>
        </div>
      </div>
    </nav>
  );
}

// ---- Hero ------------------------------------------------------------------

function Hero() {
  return (
    <section className="mx-auto max-w-5xl px-6 pt-20 pb-24 text-center">
      <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-border/60 text-xs text-muted-foreground mb-8">
        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
        Now in beta — free while we build
      </div>

      <h1 className="text-5xl md:text-6xl font-semibold tracking-tight leading-[1.05] max-w-3xl mx-auto">
        Your personal AI assistant that <em className="not-italic text-accent">actually does</em> the work.
      </h1>

      <p className="text-lg text-muted-foreground max-w-xl mx-auto mt-6">
        Paperloft Assist chats with you, searches the web, drives your browser,
        and grows with pluggable skills. One tool for everything you keep
        telling yourself you&apos;ll get around to.
      </p>

      <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-3">
        <form
          action={async () => {
            "use server";
            await signIn("google", { redirectTo: "/chat" });
          }}
        >
          <button
            type="submit"
            className="inline-flex items-center gap-3 px-6 py-3 rounded-lg bg-foreground text-background font-medium hover:opacity-90 transition text-base"
          >
            <GoogleGlyph />
            Sign up with Google
          </button>
        </form>
        <form
          action={async () => {
            "use server";
            await signIn("google", { redirectTo: "/chat" });
          }}
        >
          <button
            type="submit"
            className="inline-flex items-center gap-3 px-6 py-3 rounded-lg border border-border font-medium hover:bg-foreground/5 transition text-base"
          >
            Log in
          </button>
        </form>
      </div>

      <p className="mt-5 text-xs text-muted-foreground">
        Free forever plan. No credit card. Cancel anytime.
      </p>
    </section>
  );
}

// ---- Features --------------------------------------------------------------

function Features() {
  const items = [
    {
      icon: <IconChat />,
      title: "Conversational chat",
      body:
        "Talk to a top-tier model with proper streaming, markdown, code blocks, and history that syncs across devices.",
    },
    {
      icon: <IconBrowser />,
      title: "Browser skills",
      body:
        "Ask Paperloft Assist to search real sites — public data or your own logged-in accounts. It clicks, types, and reports back.",
    },
    {
      icon: <IconPuzzle />,
      title: "Pluggable skills",
      body:
        "Add capabilities as your needs grow: document store, calendar, GitHub, LinkedIn. Every skill runs sandboxed and pay-per-use.",
    },
    {
      icon: <IconLock />,
      title: "Your data, your control",
      body:
        "Sign in with Google. Data lives in encrypted storage tied to your account. Export or delete anytime.",
    },
  ];
  return (
    <section className="mx-auto max-w-5xl px-6 py-20">
      <SectionLabel>What it does</SectionLabel>
      <h2 className="text-3xl md:text-4xl font-semibold tracking-tight mt-3 max-w-2xl">
        Four things, done well.
      </h2>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-12">
        {items.map((f) => (
          <div
            key={f.title}
            className="p-6 rounded-xl border border-border bg-foreground/[0.02]"
          >
            <div className="h-9 w-9 rounded-lg bg-foreground/[0.06] flex items-center justify-center mb-4">
              {f.icon}
            </div>
            <h3 className="font-semibold">{f.title}</h3>
            <p className="text-sm text-muted-foreground mt-2 leading-relaxed">
              {f.body}
            </p>
          </div>
        ))}
      </div>
    </section>
  );
}

// ---- How it works ----------------------------------------------------------

function HowItWorks() {
  const steps = [
    {
      n: "01",
      title: "Sign in with Google",
      body: "One click. No forms, no passwords for Paperloft Assist to lose.",
    },
    {
      n: "02",
      title: "Ask anything",
      body:
        "Chat like you would with ChatGPT — but when you mention a real task, Paperloft Assist can *do* it.",
    },
    {
      n: "03",
      title: "Watch it work",
      body:
        "You see every step: which skill it called, what it clicked, what it found. Full transparency, easy to interrupt.",
    },
  ];
  return (
    <section id="how" className="mx-auto max-w-5xl px-6 py-20 border-t border-border/50">
      <SectionLabel>How it works</SectionLabel>
      <h2 className="text-3xl md:text-4xl font-semibold tracking-tight mt-3 max-w-2xl">
        Set up once. Skip a thousand tabs.
      </h2>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mt-12">
        {steps.map((s) => (
          <div key={s.n}>
            <div className="text-sm font-mono text-accent">{s.n}</div>
            <h3 className="font-semibold mt-2">{s.title}</h3>
            <p className="text-sm text-muted-foreground mt-2 leading-relaxed">
              {s.body}
            </p>
          </div>
        ))}
      </div>
    </section>
  );
}

// ---- Pricing ---------------------------------------------------------------

function Pricing() {
  const tiers = [
    {
      name: "Free",
      price: "£0",
      cadence: "forever",
      body: "For casual use. Great for trying things out.",
      features: [
        "50 messages / day",
        "Basic web search skill",
        "7-day chat history",
        "1 device",
      ],
      cta: "Start free",
      highlight: false,
    },
    {
      name: "Personal",
      price: "£5",
      cadence: "/ month",
      body: "For power users who want the full toolkit.",
      features: [
        "Unlimited messages",
        "All built-in skills including workit",
        "Unlimited chat history",
        "Sync across devices",
        "Priority model access",
      ],
      cta: "Coming soon",
      highlight: true,
    },
    {
      name: "Pro",
      price: "£15",
      cadence: "/ month",
      body: "For folks who want the marketplace + custom skills.",
      features: [
        "Everything in Personal",
        "Hetchnar skill marketplace access",
        "Bring-your-own API keys (cheaper)",
        "Custom skill uploads",
        "Priority email support",
      ],
      cta: "Coming soon",
      highlight: false,
    },
  ];
  return (
    <section id="pricing" className="mx-auto max-w-5xl px-6 py-20 border-t border-border/50">
      <SectionLabel>Pricing</SectionLabel>
      <h2 className="text-3xl md:text-4xl font-semibold tracking-tight mt-3 max-w-2xl">
        Free while we&apos;re in beta.
      </h2>
      <p className="text-muted-foreground mt-3 max-w-xl">
        Paid tiers roll out once we&apos;re out of beta. Current users lock in
        the beta price for life.
      </p>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-12">
        {tiers.map((t) => (
          <div
            key={t.name}
            className={`p-6 rounded-xl border ${
              t.highlight
                ? "border-accent/50 bg-accent/[0.04] ring-1 ring-accent/20"
                : "border-border bg-foreground/[0.02]"
            }`}
          >
            {t.highlight ? (
              <div className="inline-block text-[10px] uppercase tracking-wider text-accent font-semibold mb-2">
                Most popular
              </div>
            ) : null}
            <div className="text-sm font-semibold">{t.name}</div>
            <div className="mt-3 flex items-baseline gap-1">
              <span className="text-4xl font-semibold tracking-tight">{t.price}</span>
              <span className="text-sm text-muted-foreground">{t.cadence}</span>
            </div>
            <p className="text-sm text-muted-foreground mt-3">{t.body}</p>
            <ul className="mt-6 space-y-2 text-sm">
              {t.features.map((f) => (
                <li key={f} className="flex items-start gap-2">
                  <IconCheck />
                  <span>{f}</span>
                </li>
              ))}
            </ul>
            {t.name === "Free" ? (
              <form
                action={async () => {
                  "use server";
                  await signIn("google", { redirectTo: "/chat" });
                }}
                className="mt-6"
              >
                <button
                  type="submit"
                  className={`w-full py-2.5 rounded-lg font-medium text-sm transition ${
                    t.highlight
                      ? "bg-accent text-background hover:opacity-90"
                      : "bg-foreground text-background hover:opacity-90"
                  }`}
                >
                  {t.cta}
                </button>
              </form>
            ) : (
              <button
                type="button"
                disabled
                className="mt-6 w-full py-2.5 rounded-lg font-medium text-sm border border-border text-muted-foreground cursor-not-allowed"
              >
                {t.cta}
              </button>
            )}
          </div>
        ))}
      </div>
    </section>
  );
}

// ---- FAQ -------------------------------------------------------------------

function Faq() {
  const qs = [
    {
      q: "What can Paperloft Assist actually do?",
      a: "Chat, browse the web, run pluggable skills. Right now it can search UK apprenticeship sites and drive workit.info on your behalf. New skills roll out through Hetchnar, our marketplace.",
    },
    {
      q: "Do I need to install anything?",
      a: "For the chat and public-site skills — no, just sign in. For skills that drive your logged-in browser accounts, you install a small Chrome extension.",
    },
    {
      q: "Is my data safe?",
      a: "Your account is tied to your Google email. Chat history and files live in encrypted AWS storage. We never sell data. Export or delete anytime.",
    },
    {
      q: "Do you store my passwords for other sites?",
      a: "Right now, no — the browser skill uses Chrome's built-in password autofill on your machine. When we add hosted browsing later, any stored credentials will be KMS-encrypted at rest.",
    },
    {
      q: "Can I cancel my subscription?",
      a: "Yes, one click, no phone calls. Refunds pro-rated for the unused portion of any paid month.",
    },
  ];
  return (
    <section id="faq" className="mx-auto max-w-3xl px-6 py-20 border-t border-border/50">
      <SectionLabel>FAQ</SectionLabel>
      <h2 className="text-3xl md:text-4xl font-semibold tracking-tight mt-3">
        Quick answers.
      </h2>
      <div className="mt-10 divide-y divide-border/60">
        {qs.map((f) => (
          <details key={f.q} className="py-5 group">
            <summary className="cursor-pointer list-none flex items-start justify-between gap-4 font-medium">
              <span>{f.q}</span>
              <span className="text-muted-foreground text-2xl leading-none group-open:rotate-45 transition-transform">
                +
              </span>
            </summary>
            <p className="text-sm text-muted-foreground mt-3 leading-relaxed">
              {f.a}
            </p>
          </details>
        ))}
      </div>
    </section>
  );
}

// ---- Contact ---------------------------------------------------------------

function Contact() {
  return (
    <section id="contact" className="mx-auto max-w-3xl px-6 py-20 border-t border-border/50 text-center">
      <SectionLabel>Get in touch</SectionLabel>
      <h2 className="text-3xl md:text-4xl font-semibold tracking-tight mt-3">
        Say hi. Report a bug. Ask for a skill.
      </h2>
      <p className="text-muted-foreground mt-4">
        We read every message.
      </p>
      <a
        href="mailto:shreyas.pavuluri@gmail.com"
        className="inline-flex items-center gap-2 mt-8 px-5 py-3 rounded-lg border border-border font-medium hover:bg-foreground/5 transition"
      >
        <IconMail />
        shreyas.pavuluri@gmail.com
      </a>
    </section>
  );
}

// ---- Footer ----------------------------------------------------------------

function Footer() {
  return (
    <footer className="border-t border-border/50">
      <div className="mx-auto max-w-6xl px-6 py-10 flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <LogoMark />
          <span>Paperloft Assist · Built with care</span>
        </div>
        <div className="flex items-center gap-5 text-sm text-muted-foreground">
          <a href="#pricing" className="hover:text-foreground transition">Pricing</a>
          <a href="#faq" className="hover:text-foreground transition">FAQ</a>
          <a href="#contact" className="hover:text-foreground transition">Contact</a>
          <a
            href="https://github.com/Shreyas-Profile/paperloft-assist"
            className="hover:text-foreground transition"
          >
            Source
          </a>
        </div>
      </div>
      <div className="mx-auto max-w-6xl px-6 pb-6 text-xs text-muted-foreground text-center md:text-left">
        © {new Date().getFullYear()} Paperloft Assist. Made in the UK.
      </div>
    </footer>
  );
}

// ---- Small bits ------------------------------------------------------------

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <div className="text-xs uppercase tracking-widest text-accent font-semibold">
      {children}
    </div>
  );
}

function LogoMark() {
  return (
    <div className="w-7 h-7 rounded-md bg-foreground text-background flex items-center justify-center text-sm font-bold">
      P
    </div>
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

function IconChat() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
    </svg>
  );
}
function IconBrowser() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="4" width="18" height="16" rx="2"/><path d="M3 9h18"/><path d="M7 6.5h.01"/><path d="M10 6.5h.01"/>
    </svg>
  );
}
function IconPuzzle() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <path d="M14 3.5a1.5 1.5 0 1 1-3 0v-.5a1 1 0 0 0-1-1H6a1 1 0 0 0-1 1v4a1 1 0 0 0 1 1h.5a1.5 1.5 0 1 1 0 3H6a1 1 0 0 0-1 1v4a1 1 0 0 0 1 1h4a1 1 0 0 0 1-1v-.5a1.5 1.5 0 1 1 3 0v.5a1 1 0 0 0 1 1h4a1 1 0 0 0 1-1v-4a1 1 0 0 0-1-1h-.5a1.5 1.5 0 1 1 0-3h.5a1 1 0 0 0 1-1V3a1 1 0 0 0-1-1h-4a1 1 0 0 0-1 1z"/>
    </svg>
  );
}
function IconLock() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <rect x="4" y="10" width="16" height="10" rx="2"/><path d="M8 10V7a4 4 0 1 1 8 0v3"/>
    </svg>
  );
}
function IconCheck() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mt-0.5 text-accent shrink-0">
      <path d="M20 6 9 17l-5-5"/>
    </svg>
  );
}
function IconMail() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="5" width="18" height="14" rx="2"/><path d="m3 7 9 6 9-6"/>
    </svg>
  );
}
