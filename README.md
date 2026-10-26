# LiciTot

**Totul se licitează.** LiciTot is a Romanian online auction marketplace. Every account can both sell and bid, and the platform keeps a 5% fee on completed auctions.

> ⚠️ Payments currently run on **Stripe sandbox** keys (the site shows a banner), and the operator in the legal pages is a placeholder (`src/lib/legal.ts`). Have a lawyer review the legal texts before a real launch.

## Stack

- **App:** Next.js 16 (App Router, Cache Components), React 19, TypeScript and Tailwind CSS v4, with shadcn/ui components.
- **Backend:** Supabase for Auth, Postgres with RLS, Realtime and pg_cron.
- **Services:** ImageKit for images and Stripe Connect (Express) for payments.
- **Hosting:** Vercel (free Hobby plan), functions in Dublin next to Supabase.

See [CLAUDE.md](CLAUDE.md) for conventions and [BRAND.md](BRAND.md) for the brand system.

## Getting started

Requirements: Node ≥ 22 and pnpm (`npm i -g pnpm`).

```bash
pnpm install
cp .env.example .env.local   # fill in values as phases need them
pnpm dev                     # http://localhost:3000
```

| Command         | What it does                                 |
| --------------- | -------------------------------------------- |
| `pnpm dev`      | Dev server (Turbopack)                       |
| `pnpm build`    | Production build                             |
| `pnpm check`    | Lint + typecheck + unit tests                |
| `pnpm test`     | Vitest (money, dates, phone, brand contrast) |
| `pnpm icons`    | Regenerate logo files, favicon and PWA icons |
| `pnpm icons:ui` | Regenerate the UI icon set (Phosphor)        |

### External services (added in later phases)

1. **Supabase (Phase 2):** create a free hosted project. Docker isn't needed, because migrations and auth settings are pushed with the CLI.
   1. Fill the Supabase section of `.env.local`: URL, publishable key, secret key, project ref, access token (Account → Access Tokens) and DB password.
   2. Run:
      ```bash
      pnpm db:link     # once
      pnpm db:push     # apply supabase/migrations
      pnpm db:config   # apply auth settings from supabase/config.toml
      pnpm db:types    # regenerate src/types/database.ts
      pnpm test:db     # verify RLS policies against the project
      ```
   3. **Google sign-in (optional):**
      1. In Google Cloud Console, create an OAuth client of type "Web application" with redirect URI `https://<ref>.supabase.co/auth/v1/callback`.
      2. Set `SUPABASE_AUTH_EXTERNAL_GOOGLE_CLIENT_ID` and `SUPABASE_AUTH_EXTERNAL_GOOGLE_SECRET` in `.env.local`.
      3. Set `enabled = true` under `[auth.external.google]` in `supabase/config.toml`.
      4. Run `pnpm db:config`.
   4. **Email:** the free tier's built-in sender only delivers to your project's team members. Use your own address for testing, or configure SMTP (Phase 7).
2. **ImageKit (Phase 3):** create an account and copy the URL endpoint, public key and private key from Developer options into `.env.local`.
   - Files go under `/licitot/auctions/<user id>/` and `/licitot/avatars/<user id>/`.
   - No dashboard configuration is needed. Automatic format (`f-auto`) is requested per URL.
3. **Stripe (Phase 6):** put the sandbox keys (`pk_test_…`, `sk_test_…`) in `.env.local` and `.env.vercel`.
   1. **Enable Connect** once: Stripe Dashboard (sandbox) → Connect → Get started → "Platform or marketplace", then complete the platform profile. Without it, sellers can't activate payouts.
   2. **Locally**, no webhook is needed: payments are confirmed when the buyer returns from Checkout, and the seller's status when they return from onboarding.
   3. **After deploying**, create the two webhook endpoints and copy the printed secrets into Vercel (`STRIPE_WEBHOOK_SECRET`, `STRIPE_CONNECT_WEBHOOK_SECRET`):
      ```bash
      pnpm stripe:webhooks https://licitot.ro
      ```
   4. Test card: `4242 4242 4242 4242`, any future date and CVC. In seller onboarding (test mode), the phone code is `000 000`.
4. **Vercel (deploy):** see [Deploy](#deploy-vercel-free) below.

## Deploy (Vercel, free)

Vercel project **`lici-tot/licitot`** builds from GitHub on its own servers. Every push to `main` goes to production; other branches get preview deployments (protected by Vercel login). Server parts (sign-in, Server Actions, the proxy) run as functions in **Dublin (`dub1`, `vercel.json`)**, next to Supabase (eu-west-1). Static and cached pages come from Vercel's CDN (Frankfurt for visitors in Romania).

- **CLI:** `pnpm vc <command>` (Vercel CLI 62.4.0); log in once with `pnpm vc login`.
- **Environment variables (Production):** every `NEXT_PUBLIC_*`, `SUPABASE_SECRET_KEY`, `IMAGEKIT_PRIVATE_KEY`, `STRIPE_*`, `CRON_SECRET`, plus `ENABLE_EXPERIMENTAL_COREPACK=1` (so Vercel installs pnpm 12 from `packageManager`). The values are in the git-ignored `.env.vercel`; set one with `pnpm vc env add NAME production` (value on stdin), then redeploy.
- **Orders job (every 5 minutes):** pg_cron job `licitot-orders-http` in Supabase calls `POST /api/cron/orders` through pg_net, with `CRON_SECRET` read from Supabase Vault (`licitot_cron_secret`). If you change `CRON_SECRET`, update it in Vercel **and** in Vault (`select vault.update_secret(id, 'new value')`). Check runs in `cron.job_run_details` and responses in `net._http_response`.
- **E2E against the live site:** `E2E_BASE_URL=https://licitot.ro pnpm test:e2e` (no local server).

### Domain (licitot.ro)

The site is served at **https://licitot.ro**; the domain is registered at ROTLD (registrar ICI). DNS records:

| Type  | Name                 | Value                                                        |
| ----- | -------------------- | ------------------------------------------------------------ |
| A     | `licitot.ro`         | `76.76.21.21` (Vercel)                                       |
| CNAME | `www`                | `cname.vercel-dns.com` (Vercel redirects it to `licitot.ro`) |
| TXT   | `_vercel.licitot.ro` | the two `vc-domain-verify=…` values from Vercel              |

If the DNS is on Cloudflare, these records must be **DNS only** (grey cloud). HTTPS is a Let's Encrypt certificate issued and renewed by Vercel.

If the address ever changes: update `NEXT_PUBLIC_SITE_URL` in Vercel, `SUPABASE_AUTH_SITE_URL` and `SUPABASE_AUTH_PROD_REDIRECT` in `.env.local`, run `pnpm db:config` so Supabase allows sign-in redirects to the new address, update the URL in `private.call_orders_job()` (new migration), move the Stripe webhook endpoints to the new URL (Stripe doesn't follow redirects), then redeploy.

A Cloudflare Workers setup (OpenNext) is kept on the `cloudflare` branch for later; it needs the Workers Paid plan and an OpenNext release with the Cache Components fix.

## Roadmap

1. ✅ Project setup, design tokens, brand book (`/brand`), logo, layout
2. ✅ Supabase schema, migrations, RLS, auth, profiles
3. ✅ Create auction flow with ImageKit uploads
4. ✅ Listings, search, filters, detail page
5. ✅ Bidding engine (proxy bids via RPC), realtime, anti-sniping, closing job, watchlist
6. ✅ Stripe Connect onboarding, checkout, 5% fee, webhooks, orders; legal + contact pages
   - ✅ Safe payments (escrow): handover codes, AWB, deadlines, refunds, disputes (/admin); duplicate-photo check and new-seller limits
7. ✅ Notifications (in-app, live; email ready for Resend), reviews, watchlist, admin (stats, reports, disputes, moderation)
8. Legal pages, SEO, PWA, performance pass, E2E tests, deploy
