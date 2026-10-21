@AGENTS.md

# LiciTot — project conventions

Romanian online auction marketplace. Every user can both sell and bid. The platform takes a 5% fee
on completed auctions (Stripe Connect, **test mode only**). Built in phases; see the plan in
`README.md#roadmap`. Stop after each phase for review.

## Stack (versions verified Oct 2026)

- Next.js 16.4 (App Router, Turbopack, **Cache Components + Partial Prefetching on**), React 19.3, TypeScript 5.9 strict
- Tailwind CSS v4 (tokens in `src/app/globals.css`), shadcn/ui (`radix-nova` style, Radix primitives), lucide-react
- next-intl 4 (single locale `ro`, no locale routing yet), Zod 4, React Hook Form
- Supabase (hosted project, no Docker): Auth, Postgres + RLS, Realtime, pg_cron. `@supabase/ssr`
- ImageKit (signed uploads), Stripe Connect Express (sandbox keys now; live keys later), stripe-node 22
- pnpm 12, Vitest 5, Playwright, ESLint 9, Prettier
- **Deploy: Vercel** (free Hobby plan, project `lici-tot/licitot`), built from GitHub on every push to
  `main`; functions in **Dublin** (`vercel.json` → `dub1`, next to Supabase eu-west-1).
  Production: **https://licitot.ro** (see README → Deploy/Domain). CLI: `pnpm vc`.
  Netlify is retired (builds stopped). A Cloudflare Workers setup waits on the `cloudflare` branch.

## Next.js 16 specifics — read `node_modules/next/dist/docs/` before using an API

- `middleware.ts` is now **`src/proxy.ts`**.
- Cache Components: data is dynamic by default. Use `"use cache"` + `cacheLife`/`cacheTag` to cache.
  `Date.now()`, `new Date()`, `Math.random()`, uncached file/network I/O in a prerendered tree must be
  inside `"use cache"` or behind `await connection()` + `<Suspense>` (see `components/layout/footer.tsx`).
- `params`, `searchParams`, `cookies()`, `headers()` are async.
- Values returned from `"use cache"` must be plain serializable data (use base64 for binary; see `lib/brand/og.tsx`).

## Folder structure

```
src/app/(site)/        public pages with header/footer/mobile nav
src/app/(auth)/        auth pages (Phase 2)
src/app/api/           route handlers: ImageKit auth, Stripe webhook, cron (orders) only
src/components/ui/     shadcn primitives (customized for brand — sizes ≥40px, solid hover colors)
src/components/layout/ header, footer, mobile nav, theme toggle, demo banner
src/components/brand/  <Logo/>, <LogoMark/>
src/features/<domain>/ components/, actions.ts, queries.ts, schemas.ts, *.test.ts
src/lib/               money, dates, phone, counties, site, supabase/*, brand/*
messages/ro.json       ALL user-facing strings
supabase/migrations/   SQL migrations — the only way the DB changes
scripts/               gen-icons.ts (no seed/demo data: the DB holds only real users)
```

## Rules

- **Money is integer bani** (`bigint` in Postgres, `number` safe-integer in TS). Never floats.
  Use `formatRON`, `parseRONToBani`, `calcPlatformFee` from `src/lib/money.ts`.
- **Dates**: store `timestamptz`; display via `src/lib/dates.ts` (always `Europe/Bucharest`, `ro-RO`).
- **Strings**: every UI string lives in `messages/ro.json` (typed keys). Romanian with correct
  diacritics: **ș ț with comma-below**, never ş ţ (cedilla). Informal "tu" tone (see BRAND.md).
- **Validation**: Zod schema on every Server Action and route handler; share schemas with forms.
- **Security**: RLS on every table with a comment explaining each policy. Bids/orders/status changes
  only through Postgres functions (RPC) or the Stripe webhook. Service-role client is server-only.
- **DB changes**: `pnpm sb migration new <name>` → edit SQL → `pnpm db:push` → `pnpm db:types`
  → `pnpm test:db`. Never edit an applied migration (add a new one). Never change schema or auth
  settings in the dashboard: auth config lives in `supabase/config.toml` → `pnpm db:config`.
- **Supabase keys**: new-style keys only — `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` (`sb_publishable_…`)
  and server-only `SUPABASE_SECRET_KEY` (`sb_secret_…`). Clients in `src/lib/supabase/`:
  `server.ts` (user session, RLS), `client.ts` (browser), `public.ts` (anon, for `"use cache"`),
  `admin.ts` (secret key, bypasses RLS — trusted server code only), `proxy.ts` (session refresh).
- **Auth on the server**: use `getCurrentUser()` / `requireUser()` (`features/auth/session.ts`),
  which validate JWT claims via `getClaims()`. Never trust `getSession()` server-side.
  Session reads make a subtree dynamic → wrap in `<Suspense>`.
- **Profiles**: public data in `profiles` (readable by all), private data in `profiles_private`
  (owner-only). Users may only update columns granted via column-level GRANT; role, ban, ratings
  and Stripe flags change server-side only.
- **Validation messages are dictionary keys** (`msg("validation.email")`), never literal text, so
  the same Zod schema runs on client and server. Server Actions return `ActionResult`
  (`lib/action-result.ts`); forms apply it with `applyActionResult()`.
- **Rate limiting**: `rateLimit()` (`lib/rate-limit.ts`) on auth, uploads and (later) bidding.
- **Images (ImageKit)**: store file _paths_ (`/licitot/auctions/<uid>/<uuid>.webp`), never URLs.
  - Uploads: browser compresses to WebP and makes a ~20px blur data URL, then gets a signed token
    from `/api/imagekit/auth`, which picks the folder per user, then uploads straight to ImageKit.
  - On save, the server checks each file with the ImageKit API (`verifyUploadedImage`) and the
    folder (`isOwnPath`). The DB also checks the path in CHECK constraints and RLS.
  - Display: `next/image` with the global loader (`lib/imagekit-loader.ts`: `f-auto`, width).
  - Removed or replaced files are deleted after the response, using `after()`.
- **Auctions**: sellers write drafts directly (RLS + column grants); lifecycle changes only via
  RPCs (`publish_auction`; `place_bid`/closing in Phase 5). RPC errors are `P0001` with a stable
  code in the message, mapped to `sell.errors.<code>`.
- **Bidding**: proxy bids only through `place_bid(auction, max)` (locks the auction row). Maximums
  live in `auto_bids` (owner-only); the public history comes from `get_auction_bids()` with masked
  names. Bids in the last 2 minutes extend the end by 2 minutes. `buy_now` only before the first
  bid; `cancel_auction` only before the first bid. pg_cron `licitot-close-auctions` closes ended
  auctions every minute (sold if the reserve is met).
- **Reserve price is secret**: `auctions` uses column-level SELECT grants (no `reserve_price`);
  the public sees `has_reserve`/`reserve_met`, sellers read it via `get_auction_reserve()`.
  Never `select("*")` on auctions; **a new auctions column must be added to that grant**.
- **Payments (Stripe Connect Express, escrow)**: sellers onboard from `/cont/incasari`; publishing
  needs `stripe_charges_enabled`. A sale (closing job or buy now) creates an `orders` row via
  trigger. The buyer picks delivery and pays on Stripe Checkout as a **separate charge** on the
  platform (`transfer_group` = order id): the money is held until the order completes, then
  `settleOrders()` transfers item + shipping − 5% to the seller (`source_transaction` = charge).
  Payment is confirmed idempotently by the webhook **and** on return from Checkout
  (`fulfillCheckoutSession`, amount checked in `order_mark_paid`).
  - Pickup: the buyer's 6-digit handover code (`get_handover_code`, buyer-only) is typed in by
    the seller (`confirm_handover`, 5 wrong tries → 30 min lock) → completed, paid out now.
  - Courier: the seller enters carrier + AWB (`mark_order_shipped`); paid out when the buyer
    confirms or 5 days later (+4 for new sellers) unless disputed.
  - Seller deadline 5 days (`ship_by`): then the buyer may cancel (full refund); auto-cancel at
    10 days. Disputes (`open_dispute`) freeze the money; admins decide at `/admin`.
  - Time-based steps: pg_cron `advance_orders()` every 5 min; Stripe transfers/refunds run in
    `settleOrders()` from the order page, after order actions and from pg_cron job
    `licitot-orders-http` (every 5 min, pg_net) → `POST /api/cron/orders` with `CRON_SECRET` from
    Supabase Vault (`licitot_cron_secret`; keep it equal to the Vercel env var).
  - Order/Stripe state changes only through RPCs; service-role ones are called from
    `features/payments/server.ts`. Minimum price is 2 RON (Stripe). Contact details of the other
    party come from `get_order_contact()` only after payment.
  - Reads that must be fresh after a change in the same request use `.abortSignal(fresh())`
    (`features/payments/queries.ts`): Next.js memoizes identical GET fetches during a render.
- **Listing safety**: `publish_auction` requires every photo's ImageKit pHash (stored by the
  server via `set_auction_image_hashes`), refuses photos within Hamming distance 6 of another
  seller's listing (`duplicate_photo`) and limits sellers without a paid-out sale to 3 active
  auctions (`new_seller_limit`).
- **Notifications**: rows in `notifications` are written only by DB triggers (auctions, orders,
  reviews) and RPCs (reports, admin tools, `notify_watch_ending` via pg_cron); the UI renders
  `type` + `data` with `features/notifications/format.ts` → `notifications.types.*`. Emails go
  out from the cron job via Resend once `RESEND_API_KEY` + `EMAIL_FROM` are set (last 24 h only).
- **Reviews**: `leave_review()` after a completed order, once per party, within 30 days; a trigger
  keeps `profiles.rating_avg/rating_count`. Profiles are cached: call `updateTag(profileTag(u))`.
- **Moderation**: `report_content()` (listing or profile); admins (`profiles.role = admin`) use
  `/admin` (stats, reports, disputes) and RPCs `admin_hide_auction`, `admin_set_banned`,
  `admin_resolve_report`, `admin_stats` — each re-checks `is_admin()`.
- **Clocks**: time comparisons that gate money (payout due, deadlines) run in SQL with `now()`
  (e.g. `orders_ready_for_payout()`), never against the app server clock.
- **Legal pages** read the operator's details from `src/lib/legal.ts` (fictional "LiciTot"
  until the real company exists; empty fields are hidden). Long texts are in `legal.*`.
- **Feature flags**: `private.app_settings` (`require_connect_for_publish` is true since
  Phase 6). Change them only via migrations.
- **Session code must be request-time**: `lib/supabase/server.ts` calls `connection()` first.
- **Caching**: public listing data is cached in `features/auctions/listing.ts` with
  `"use cache"`, `cacheLife("minutes")` and tag `auctions` (+ `auction:<id>`). It uses the anon
  client from `lib/supabase/public.ts`. Mutations that change public listings call
  `updateTag("auctions")`. Live prices on the detail page come from Realtime (Phase 5).
- **Search**: Postgres FTS with config `ro_unaccent` (Romanian stemming + unaccent) on the
  generated `auctions.search_tsv` column. Browse filters live in the URL, with Romanian param names
  parsed by `features/search/params.ts`. Search pages are `noindex`; categories and auctions
  are indexable.
- **URLs**: auction pages are `/licitatie/<uuid>-<slug>`. Stale slugs 308-redirect to the
  canonical URL.
- **Components**: Server Components by default; `"use client"` only for interactive islands.
  Realtime subscriptions only on the auction detail page and the header notification bell
  (which must `realtime.setAuth(token)` before subscribing: private rows need the user token).
- **Brand** ("Bleu", chosen by the owner; see BRAND.md): clean blues from baby blue to navy.
  Brand blue `primary`, baby blue `sky` (decoration only), `hero-*` gradient tokens, navy `ink`
  (footer, chips on photos), `tint` surfaces, red `live` only for the live dot and the last
  hour. No lime/neon accents. One font family, Geist (self-hosted in `src/assets/fonts/`):
  `font-display` = weight 750 + tight tracking. Prices and countdowns use `tabular-nums`.
- **Colors**: use semantic tokens (`bg-primary`, `text-muted-foreground`, `bg-tint`…), never raw
  hex in components. Adding a token? Update `src/lib/brand/tokens.ts` + `globals.css`;
  `pnpm test` checks sync and WCAG AA contrast.
- **Motion**: transform/opacity only, `ease-snap`, tokens `animate-rise|bump|raise` in
  `globals.css`; everything stops under `prefers-reduced-motion`. The auction card price must
  stay the only `.text-primary` inside `<article>` (e2e reads it).
- **No `any`**. `noUncheckedIndexedAccess` is on.
- **Editing files on Windows**: don't round-trip files through PowerShell `Get-Content`/`Set-Content`
  (it mangles UTF-8 diacritics). Use the editor tools.
- No demo/seed data. While Stripe uses sandbox keys (`pk_test_`), `<DemoBanner/>` labels it on every
  page (`isPaymentsTestMode` in `lib/env.ts`); with live keys it disappears.

## Commands

```
pnpm dev            # dev server (Turbopack)
pnpm build          # production build — must pass before finishing a phase
pnpm check          # lint + typecheck + unit tests
pnpm test           # Vitest
pnpm format         # Prettier (with Tailwind class sorting)
pnpm icons          # regenerate logo SVGs, favicon, PWA icons from lib/brand/logo-geometry.ts
pnpm test:db        # RLS/integration tests against the dev Supabase project (creates + deletes users)
pnpm test:e2e       # Playwright (mobile + desktop) against `pnpm start` — run `pnpm build` first
pnpm db:push        # apply new migrations to the hosted project
pnpm db:types       # regenerate src/types/database.ts
pnpm db:config      # push supabase/config.toml auth settings
pnpm stripe:webhooks https://<site>  # create the 2 Stripe webhook endpoints, print secrets
pnpm sb <args>      # any Supabase CLI command with .env.local loaded
```

## Known constraints

- Supabase free tier + built-in email sender: custom email templates are rejected and email
  delivery is limited (built-in SMTP only delivers to the project's team members, a few per
  hour). Romanian templates are ready in `supabase/templates/`; enable them with custom SMTP
  (Resend) in Phase 7.
- Google sign-in is wired but disabled until OAuth credentials are set (see README).
