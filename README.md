# Alpha Assist

A general-purpose AI assistant platform. Chat interface with markdown output, document uploads, and a pluggable skill system. Google sign-in, per-user storage, marketplace + "my skills" model. Designed with a human-in-the-loop philosophy.

Skills live in a separate repo — [`alpha-assist-skills`](https://github.com/Shreyas-Profile/alpha-assist-skills) *(coming in Phase 3)*.

## Stack

- **Next.js 16** (App Router) + **TypeScript** + **Tailwind CSS 4**
- **Auth.js v5** (NextAuth) with **Google** provider
- **Prisma 7** with **SQLite** for dev (Postgres for prod, later)
- **next-themes** for dark / light / system switching *(wiring in a follow-up commit)*
- **shadcn/ui** components *(added incrementally)*

## Milestone status

| Phase | Deliverable | Status |
|---|---|---|
| **1. Foundation + auth** | Scaffold, Google sign-in, auth-gated `/chat`, Anthropic-inspired theme | 🚧 *this commit* |
| 2. Chat + streaming | Markdown chat UI, streaming from OpenRouter, history modal, 20-msg context cap | — |
| 3. Skills MVP | Marketplace, my-skills, HITL approval flow | — |
| 4. Documents | Upload (PDF/DOCX/PPTX), per-user quotas, RAG chunks | — |
| 5. Usage + polish | Token/cost tracking, rate limits, mobile responsive | — |
| 6. Deploy | Postgres migration, Cloudflare R2, Vercel | — |
| 7+. Default skills | Image gen, OCR, GitHub, Gmail, Telegram bridge, WhatsApp | — |

## Setup

Prerequisites: **Node.js 22+**, **pnpm**.

```powershell
git clone https://github.com/Shreyas-Profile/alpha-assist.git
cd alpha-assist
pnpm install

# Configure secrets — see .env.example for what each var is
Copy-Item .env.example .env
notepad .env

# Create the SQLite database
pnpm prisma db push

# Run
pnpm dev
```

Then open http://localhost:3000, click **Sign in with Google**, and you should land on `/chat`.

### Getting Google OAuth credentials

1. Go to https://console.cloud.google.com/ and create a project.
2. **APIs & Services → OAuth consent screen**: External, add yourself as a test user, scopes `openid` + `email` + `profile`.
3. **APIs & Services → Credentials → Create OAuth Client ID**: Web application.
   - Authorized JavaScript origin: `http://localhost:3000`
   - Authorized redirect URI: `http://localhost:3000/api/auth/callback/google`
4. Copy the Client ID and Secret into `.env` as `AUTH_GOOGLE_ID` / `AUTH_GOOGLE_SECRET`.

## Project structure

```
alpha-assist/
├── prisma/
│   └── schema.prisma          # Auth.js required tables
├── src/
│   ├── app/
│   │   ├── page.tsx            # Landing (public)
│   │   ├── signin/page.tsx     # Sign-in page (public)
│   │   ├── chat/page.tsx       # Authed placeholder — chat UI in M2
│   │   ├── api/auth/[...nextauth]/route.ts
│   │   ├── layout.tsx
│   │   └── globals.css         # Anthropic-inspired palette
│   ├── lib/
│   │   ├── auth.ts             # Auth.js config (single source)
│   │   └── db.ts               # Prisma singleton
│   └── middleware.ts           # Route guard for /chat
├── .env.example
└── ...
```
