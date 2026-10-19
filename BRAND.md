# LiciTot — Brand book

> **Totul se licitează.** Clear, bright and trustworthy: clean blues from baby blue to navy.
> Live version with rendered components and computed contrast: **`/brand`**.

## Concept

**The raised paddle.** In every auction room, raising your paddle is how you say "me!". The
LiciTot mark is that paddle, leaning forward like a hand lifting it. The **L** is cut out of the
paddle and also reads as the hands of a clock: every auction races the clock.

The look is **"Bleu"**: the original LiciTot baby blue taken to a premium level. Light and airy
surfaces, soft blue gradients, one confident brand blue for everything you read or press, navy
for depth, and **red only for "live"** and the last minutes of an auction.

## Colors

Source of truth: `src/lib/brand/tokens.ts` (mirrored in `src/app/globals.css`). `pnpm test` fails if
the two drift or if any pair the UI uses drops under WCAG AA.

| Token              | Light                             | Dark                              | Use                                                      |
| ------------------ | --------------------------------- | --------------------------------- | -------------------------------------------------------- |
| `primary`          | `#1666D8`                         | `#5AA7F5`                         | Buttons, links, prices, the paddle                       |
| `primary-hover`    | `#1257BD`                         | `#7DBAF7`                         | Button hover (solid, not opacity)                        |
| `sky`              | `#A9D3FA`                         | `#A9D3FA`                         | Baby blue: gradients, flashes, illustration. Never text  |
| `hero-from/via/to` | `#E8F3FE` → `#CFE6FC` → `#A9D3FA` | `#0B1B3D` → `#0E2A5E` → `#1A4C99` | Hero gradient (`hero-foreground`, `hero-muted` for text) |
| `live`             | `#D0313A`                         | `#D0313A`                         | Live dot, countdown chip in the last hour (white text)   |
| `ink`              | `#0A1A3A`                         | `#050C18`                         | Navy: footer, chips on photos (`ink-accent` = baby blue) |
| `background`       | `#F4F8FD`                         | `#08111F`                         | Page background                                          |
| `card`             | `#FFFFFF`                         | `#0F1C33`                         | Cards, fields, menus                                     |
| `tint`             | `#E3EFFC`                         | `#11264A`                         | Soft blue surfaces: icons, current price, live badge     |
| `foreground`       | `#0A1A3A`                         | `#EAF1FA`                         | Body text                                                |
| `muted-foreground` | `#566580`                         | `#9DB0C9`                         | Secondary text                                           |
| `border`           | `#DCE6F2`                         | `#1E3253`                         | Dividers, card borders                                   |
| `input`            | `#7A8BA5`                         | `#5F7596`                         | Form control borders (≥3:1)                              |
| `success`          | `#0E7A43`                         | `#4ADE80`                         | Won, paid, leading                                       |
| `warning`          | `#9E5300`                         | `#FBBF24`                         | Ending soon, reserve not met, test-mode banner           |
| `destructive`      | `#C42B25`                         | `#FF8076`                         | Errors, outbid, cancelled                                |

Each status color has a `-soft` background (`success-soft`, `warning-soft`, `destructive-soft`).

**Rules**

- **Baby blue is decoration only** (1.5:1 on the page); a unit test enforces it.
- **Red means live.** Use `live` only for the live dot and the last hour of an auction; errors
  use `destructive`.
- One accent per view: the brand blue is the action. Don't add other hues for emphasis.

## Typography

One family, **Geist** (variable 100–900), self-hosted as a single-file subset (Latin + Romanian,
~34 KB) via `next/font/local`; see `src/assets/fonts/README.md`. Always use **ș/ț
(U+0219/U+021B)**, never the cedilla forms ş/ţ.

| Style   | Tailwind                                             | Weight        |
| ------- | ---------------------------------------------------- | ------------- |
| Display | `font-display text-display` (fluid 44–80 px)         | 750, −0.045em |
| H1      | `font-display text-4xl`                              | 750, −0.03em  |
| H2      | `font-display text-3xl`                              | 750, −0.03em  |
| H3      | `text-xl font-semibold`                              | 600           |
| Body    | `text-base` / `text-sm`                              | 400           |
| Eyebrow | `text-xs font-semibold tracking-[0.14em] uppercase`  | 600           |
| Price   | `font-bold tracking-tight text-primary tabular-nums` | 700, tabular  |

`font-display`/`font-heading` default to weight 750 and −0.03em tracking (`globals.css`); a
`font-*` or `tracking-*` utility overrides them. Prices and countdowns always use `tabular-nums`.

## Logo

Geometry lives in `src/lib/brand/logo-geometry.ts` (64×64 grid, paddle path with the L as a
counter-wound hole, so it works on any background). The wordmark outlines in
`src/lib/brand/wordmark.ts` were generated once from Geist Bold with opentype.js (40 units,
tracking −0.03em, baseline 46, x = 70). In the app, use `<Logo/>` and `<LogoMark/>`
(`variant`: `brand`, `inverse` for navy bands, `mono`).

`pnpm icons` regenerates every static file:

| File                  | Use                           |
| --------------------- | ----------------------------- |
| `logo.svg`            | Default, on light backgrounds |
| `logo-reversed.svg`   | On dark backgrounds           |
| `logo-mono.svg`       | Single color (print, stamps)  |
| `logo-mono-white.svg` | Single color on photos/dark   |
| `logo-mark.svg`       | Icon only                     |
| `logo-mark-mono.svg`  | Icon only, single color       |

Favicon: `src/app/icon.svg` (lighter blue on dark browser chrome) + `favicon.ico`. App icons
(`apple-icon.png`, `public/icons/`): white paddle on brand blue. OG template:
`src/lib/brand/og.tsx` (blue gradient sky, giant paddle, Geist title).

**Rules**

- Keep clear space of at least twice the handle width around the logo.
- Minimum size: 16 px for the mark, 96 px wide for the full logo.
- Use `inverse` on navy, `mono` on photos or saturated backgrounds.
- Don't straighten the paddle, stretch, recolor, outline or add shadows to the logo.

## Shape, depth, motion

- **Radius:** `--radius` is 12 px. Buttons, badges, chips and search are pills (`rounded-full`);
  fields `rounded-xl`; cards `rounded-2xl`; big panels and dialogs `rounded-3xl`.
- **Shadows** (navy-tinted, low): `shadow-card` (resting), `shadow-raised` (hover, bid box),
  `shadow-overlay` (menus, dialogs, toasts, hero cards), `shadow-glow` (the primary action).
- **Motion:** 120 ms (press), 200 ms (hover, color), 320–520 ms (entrances). Easing
  `ease-snap` = `cubic-bezier(0.2, 0.8, 0.2, 1)`. Animate only `transform` and `opacity`.
  - `animate-rise`: staggered entrance (hero). Never on the LCP headline.
  - `animate-bump`: the price flashes baby blue once when a new bid arrives.
  - `animate-raise`: the gavel lifts on the bid button hover.
  - `<LiveDot pulse/>`: the red dot pings only in the last 24 h. Cards lift on hover.
  - `prefers-reduced-motion` stops every animation and transition (`globals.css`).

## Components

- **Buttons** (pills, 44 px default; `sm` 36, `lg` 48, `xl` 56, icon 40): `default` (brand blue +
  glow), `inverse` (white on a blue band), `ink`, `secondary`, `outline`, `ghost`, `destructive`,
  `link`. One primary button per view. "Licitează" is always the primary action.
- **Inputs:** 44 px, `rounded-xl`, white field with an `input` border (3:1); focus = ring border +
  soft halo. Errors use `aria-invalid` plus a message in `text-destructive` linked by
  `aria-describedby`.
- **Auction card:** `rounded-2xl`, 4:3 photo with the countdown chip on it (navy glass + red dot,
  all red in the last hour), title, uppercase price label, price in `text-primary`.
- **Status badges** map auction states to variants:

  | State     | Romanian label | Badge variant                |
  | --------- | -------------- | ---------------------------- |
  | active    | Activă         | `live` (soft blue + red dot) |
  | sold      | Vândută        | `ink` (inverted stamp)       |
  | unsold    | Nevândută      | `neutral`                    |
  | cancelled | Anulată        | `danger`                     |
  | draft     | Ciornă         | `outline`                    |

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
