# LiciTot

**Totul se licitează.** LiciTot is a Romanian online auction marketplace. Every account can both sell and bid, and the platform keeps a 5% fee on completed auctions.

> ⚠️ Payments currently run on **Stripe sandbox** keys (the site shows a banner), and the operator in the legal pages is a placeholder (`src/lib/legal.ts`). Have a lawyer review the legal texts before a real launch.

## Stack

- **App:** Next.js 16 (App Router, Cache Components), React 19, TypeScript and Tailwind CSS v4, with shadcn/ui components.
- **Backend:** Supabase for Auth, Postgres with RLS, Realtime and pg_cron.
- **Services:** ImageKit for images and Stripe Connect (Express) for payments.
- **Hosting:** Netlify (free tier).

See [CLAUDE.md](CLAUDE.md) for conventions and [BRAND.md](BRAND.md) for the brand system.

## Getting started

Requirements: Node ≥ 22 and pnpm (`npm i -g pnpm`).

```bash
pnpm install
cp .env.example .env.local   # fill in values as phases need them
pnpm dev                     # http://localhost:3000
```

| Command      | What it does                                 |
| ------------ | -------------------------------------------- |
| `pnpm dev`   | Dev server (Turbopack)                       |
| `pnpm build` | Production build                             |
| `pnpm check` | Lint + typecheck + unit tests                |
| `pnpm test`  | Vitest (money, dates, phone, brand contrast) |
| `pnpm icons` | Regenerate logo files, favicon and PWA icons |

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
3. **Stripe (Phase 6):** put the sandbox keys (`pk_test_…`, `sk_test_…`) in `.env.local` and `.env.netlify`.
   1. **Enable Connect** once: Stripe Dashboard (sandbox) → Connect → Get started → "Platform or marketplace", then complete the platform profile. Without it, sellers can't activate payouts.
   2. **Locally**, no webhook is needed: payments are confirmed when the buyer returns from Checkout, and the seller's status when they return from onboarding.
   3. **After deploying**, create the two webhook endpoints and copy the printed secrets into Netlify (`STRIPE_WEBHOOK_SECRET`, `STRIPE_CONNECT_WEBHOOK_SECRET`):
      ```bash
      pnpm stripe:webhooks https://licitot.netlify.app
      ```
   4. Test card: `4242 4242 4242 4242`, any future date and CVC. In seller onboarding (test mode), the phone code is `000 000`.
4. **Netlify (deploy):** see [Deploy](#deploy-netlify-free) below.

## Deploy (Netlify, free)

Netlify builds the app on its own servers from a Git repository and runs the server parts (sign-in, Server Actions, the proxy) as Netlify Functions. Dragging a folder onto Netlify ("Netlify Drop") won't work, because it only hosts static files.

1. **Push to GitHub.** Create an empty repo on GitHub (private is fine), then:
   ```bash
   git add -A && git commit -m "LiciTot"
   git remote add origin https://github.com/<you>/licitot.git
   git push -u origin main
   ```
   `.env.local` and `.env.netlify` are git-ignored, so no secrets get pushed.
2. **Import into Netlify.**
   1. Add new project → Import an existing project → GitHub → `licitot`. Build settings come from `netlify.toml` (`pnpm build`, publish `.next`, Node 22).
   2. Set the project name to `licitot` → `https://licitot.netlify.app`.
3. **Add the environment variables.** Before the first deploy, go to Project configuration → Environment variables → Import from .env and paste the contents of `.env.netlify`.
4. **Deploy.** Every later `git push` redeploys automatically.

If your URL isn't `https://licitot.netlify.app`, update `NEXT_PUBLIC_SITE_URL` in Netlify, set `SUPABASE_AUTH_PROD_REDIRECT` in `.env.local`, run `pnpm db:config` so Supabase allows sign-in redirects to the new address, then redeploy.

Building for Netlify locally on Windows (`netlify build`) currently fails while bundling the proxy, so let Netlify build it.

## Roadmap

1. ✅ Project setup, design tokens, brand book (`/brand`), logo, layout
2. ✅ Supabase schema, migrations, RLS, auth, profiles
3. ✅ Create auction flow with ImageKit uploads
4. ✅ Listings, search, filters, detail page
5. ✅ Bidding engine (proxy bids via RPC), realtime, anti-sniping, closing job, watchlist
6. ✅ Stripe Connect onboarding, checkout, 5% fee, webhooks, orders; legal + contact pages
   - ✅ Safe payments (escrow): handover codes, AWB, deadlines, refunds, disputes (/admin); duplicate-photo check and new-seller limits
7. Notifications, reviews, watchlist, admin/reporting
8. Legal pages, SEO, PWA, performance pass, E2E tests, deploy
