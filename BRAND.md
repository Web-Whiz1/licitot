# LiciTot — Brand book

> **Totul se licitează.** A modern auction house: confident, warm, alive.
> Live version with rendered components and computed contrast: **`/brand`**.

## Concept

**The raised paddle.** In every auction room, raising your paddle is how you say "me!". The
LiciTot mark is that paddle, leaning forward like a hand lifting it. The **L** is cut out of the
paddle (it also reads as the hands of a clock, because every auction races the clock), and the
**lime dot** is the live signal.

The palette and type tell the same story: Klein blue for trust and action, electric lime for
live moments, warm paper for calm browsing and midnight ink for the stage (hero, footer, "sold").

## Colors

Source of truth: `src/lib/brand/tokens.ts` (mirrored in `src/app/globals.css`). `pnpm test` fails if
the two drift or if any pair the UI uses drops under WCAG AA.

| Token              | Light     | Dark      | Use                                                         |
| ------------------ | --------- | --------- | ----------------------------------------------------------- |
| `primary`          | `#1F3BDB` | `#93A2FF` | Klein blue: buttons, links, prices, the paddle              |
| `primary-hover`    | `#1730BC` | `#AAB6FF` | Button hover (solid, not opacity)                           |
| `highlight`        | `#D2F45C` | `#D2F45C` | Lime: live signals, last hour, main CTA on ink              |
| `ink`              | `#0F1530` | `#05070F` | The stage: hero, footer, sold stamps                        |
| `ink-foreground`   | `#F7F5F0` | `#ECEEF7` | Text on ink (`ink-muted` for secondary, `ink-accent` links) |
| `background`       | `#F7F5F0` | `#0B0E1C` | Paper / midnight page background                            |
| `card`             | `#FFFFFF` | `#13172F` | Cards, fields, menus                                        |
| `tint`             | `#E9ECFD` | `#171D48` | Soft blue surfaces: icons, current price, highlighted rows  |
| `foreground`       | `#0F1530` | `#ECEEF7` | Body text                                                   |
| `muted-foreground` | `#565C6E` | `#A3A9C4` | Secondary text                                              |
| `border`           | `#E3DED4` | `#272D52` | Dividers, card borders (warm in light mode)                 |
| `input`            | `#878B9B` | `#6C7298` | Form control borders (≥3:1)                                 |
| `success`          | `#0E7A43` | `#4ADE80` | Won, paid, leading                                          |
| `warning`          | `#9E5300` | `#FBBF24` | Ending soon, reserve not met, test-mode banner              |
| `destructive`      | `#C42B25` | `#FF8076` | Errors, outbid, cancelled                                   |

Each status color has a `-soft` background (`success-soft`, `warning-soft`, `destructive-soft`).

**Rules**

- **Lime is a signal, never text on paper** (1.1:1). Use it as a background under ink text
  (14:1) or as text/dots on ink. A unit test enforces this.
- Klein blue on paper is 7.1:1 and white on Klein blue is 7.8:1, so blue text and blue buttons
  both have AA margin.
- One accent per moment: blue is the action, lime is "now". Don't put both on the same button.

## Typography

| Family                                     | Use                              | Files                                     |
| ------------------------------------------ | -------------------------------- | ----------------------------------------- |
| **Fraunces** SemiBold, SOFT 50, opsz 9–144 | Headings (`font-display`)        | `src/assets/fonts/Fraunces-Display.woff2` |
| **Geist** variable 100–900                 | Interface, body, prices, numbers | `src/assets/fonts/Geist-Variable.woff2`   |

Both are self-hosted single-file subsets (Latin + Romanian, ~80 KB together) loaded with
`next/font/local`; see `src/assets/fonts/README.md`. Always use **ș/ț (U+0219/U+021B)**, never
the cedilla forms ş/ţ. Fraunces ships one weight: headings never use `font-bold`.

| Style   | Tailwind                                             | Font               |
| ------- | ---------------------------------------------------- | ------------------ |
| Display | `font-display text-display` (fluid 42–76 px)         | Fraunces           |
| H1      | `font-display text-4xl tracking-tight`               | Fraunces           |
| H2      | `font-display text-3xl tracking-tight`               | Fraunces           |
| H3      | `text-xl font-semibold`                              | Geist 600          |
| Body    | `text-base` / `text-sm`                              | Geist 400          |
| Eyebrow | `text-xs font-semibold tracking-[0.14em] uppercase`  | Geist 600          |
| Price   | `font-bold tracking-tight text-primary tabular-nums` | Geist 700, tabular |

Prices and countdowns always use `tabular-nums` so live updates don't jitter.

## Logo

Geometry lives in `src/lib/brand/logo-geometry.ts` (64×64 grid, paddle path with the L as a
counter-wound hole, so it works on any background). The wordmark outlines in
`src/lib/brand/wordmark.ts` were generated once from `Fraunces-SemiBold-Display.ttf` with
opentype.js (44 units, tracking −0.02em, baseline 47, x = 72). In the app, use `<Logo/>` and
`<LogoMark/>` (`variant`: `brand`, `inverse` for ink bands, `mono`).

`pnpm icons` regenerates every static file:

| File                  | Use                                     |
| --------------------- | --------------------------------------- |
| `logo.svg`            | Default, on light backgrounds           |
| `logo-reversed.svg`   | On dark backgrounds (periwinkle paddle) |
| `logo-mono.svg`       | Single color (print, stamps)            |
| `logo-mono-white.svg` | Single color on photos/dark             |
| `logo-mark.svg`       | Icon only                               |
| `logo-mark-mono.svg`  | Icon only, single color                 |

Favicon: `src/app/icon.svg` (switches to periwinkle on dark browser chrome) + `favicon.ico`.
App icons (`apple-icon.png`, `public/icons/`): cream paddle on Klein blue. OG template:
`src/lib/brand/og.tsx` (midnight stage, giant paddle, Fraunces title).

**Rules**

- Keep clear space of at least twice the handle width around the logo.
- Minimum size: 16 px for the mark, 96 px wide for the full logo.
- Use `inverse` on ink, `mono` on photos or saturated backgrounds.
- Don't straighten the paddle, stretch, recolor, outline or add shadows to the logo.

## Shape, depth, motion

- **Radius:** `--radius` is 12 px. Buttons, badges, chips and search are pills (`rounded-full`);
  fields `rounded-xl`; cards `rounded-2xl`; big panels and dialogs `rounded-3xl`.
- **Shadows** (ink-tinted, low): `shadow-card` (resting), `shadow-raised` (hover, bid box),
  `shadow-overlay` (menus, dialogs, toasts), `shadow-glow` (the primary action only).
- **Motion:** 120 ms (press), 200 ms (hover, color), 320–520 ms (entrances). Easing
  `ease-snap` = `cubic-bezier(0.2, 0.8, 0.2, 1)`. Animate only `transform` and `opacity`.
  - `animate-rise`: staggered entrance (hero, live board). Never on the LCP headline.
  - `animate-bump`: the price flashes lime once when a new bid arrives.
  - `animate-raise`: the gavel lifts on the bid button hover.
  - `<LiveDot pulse/>`: pings only in the last 24 h. Cards scale and lift on hover.
  - `prefers-reduced-motion` stops every animation and transition (`globals.css`).

## Components

- **Buttons** (pills, 44 px default; `sm` 36, `lg` 48, `xl` 56, icon 40): `default` (Klein blue +
  glow), `highlight` (lime, for ink backgrounds), `ink`, `secondary`, `outline`, `ghost`,
  `destructive`, `link`. One primary button per view. "Licitează" is always the primary action.
- **Inputs:** 44 px, `rounded-xl`, white field with an `input` border (3:1); focus = ring border +
  soft halo. Errors use `aria-invalid` plus a message in `text-destructive` linked by
  `aria-describedby`.
- **Auction card:** `rounded-2xl`, 4:3 photo with the countdown chip on it (ink glass + lime dot,
  all lime in the last hour), title, uppercase price label, price in `text-primary`.
- **Status badges** map auction states to variants:

  | State       | Romanian label | Badge variant              |
  | ----------- | -------------- | -------------------------- |
  | active      | Activă         | `live` (lime + dot)        |
  | sold        | Vândută        | `ink` (inverted stamp)     |
  | unsold      | Nevândută      | `neutral`                  |
  | cancelled   | Anulată        | `danger`                   |
  | draft       | Ciornă         | `outline`                  |
  | ending soon | —              | countdown chip / `warning` |

- **Focus:** a 2 px `ring`-colored outline on every interactive element. Never remove it.

## Tone of voice

We sound like a friend who knows the ropes: clear, warm and to the point. We always use **"tu"**.

| Așa da ✓                                             | Așa nu ✗                                                     |
| ---------------------------------------------------- | ------------------------------------------------------------ |
| Ai fost depășit! Mai licitezi?                       | Oferta dumneavoastră a fost depășită de un alt utilizator.   |
| Felicitări, ai câștigat! Plătește în 3 zile.         | Licitația s-a finalizat cu succes. Vă rugăm efectuați plata. |
| Vei primi aproximativ 950 RON după comisionul de 5%. | Se aplică un comision conform termenilor.                    |

- **Short sentences, verbs first:** "Licitează", "Ridică paleta", "Pune pe licitație".
- **Be transparent about money.** Always show the fee and the final amount.
- **Errors say what happened and what to do next.** Don't blame the user.
- **Minimal emoji.** At most one, only in celebratory messages.
