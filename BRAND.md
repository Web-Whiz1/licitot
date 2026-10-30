# LiciTot — Brand book

> **Totul se licitează.** A modern auction house: warm stone paper, one bordo accent, serif
> headlines. Live version with rendered components and computed contrast: **`/brand`**.

## Concept

**The raised paddle.** In every auction room, raising your paddle is how you say "me!". The
LiciTot mark is that paddle, leaning forward like a hand lifting it. The **L** is cut out of the
paddle and also reads as the hands of a clock: every auction races the clock.

The look is **"Casa de licitații"** (chosen by the owner, October 2026): the calm of a catalog
instead of a generic app. Barely warm stone neutrals (not cream), **one bordo accent** for
everything you press or pay, a serif for headlines and a clean sans for everything else. Status
colors are muted and always come with an icon and a label. Restraint over decoration: the only
flourish is the **"Adjudecat"** stamp on sold items.

## Colors

**Pergament** (Oct 2026): the palette follows the photographs — warm parchment, cream cards, walnut
text, one oxblood accent. Dark mode is a warm espresso room, not an inversion.

Source of truth: `src/lib/brand/tokens.ts` (mirrored in `src/app/globals.css`). `pnpm test` fails if
the two drift or if any pair the UI uses drops under WCAG AA.

| Token              | Light     | Dark      | Use                                                                 |
| ------------------ | --------- | --------- | ------------------------------------------------------------------- |
| `primary`          | `#7A2A22` | `#D97A6C` | Oxblood: primary button, links, prices, the paddle, focus           |
| `primary-hover`    | `#63211B` | `#E6917F` | Button hover (solid, not opacity)                                   |
| `tint`             | `#F0DDD2` | `#3A201B` | Accent tint: live badge, new-bid flash, selection                   |
| `background`       | `#EDE5D6` | `#17110D` | Page: warm parchment (with `paper-grain`)                           |
| `card`             | `#F8F2E7` | `#211913` | Cards, fields, panels: cream                                        |
| `popover`          | `#FBF7EF` | `#2A2019` | Menus, dialogs, toasts (the only layers with a shadow)              |
| `muted`            | `#E4D9C6` | `#2B2119` | Subtle surfaces, hover backgrounds, the "closed" state              |
| `foreground`       | `#241A12` | `#EFE5D6` | Text: walnut                                                        |
| `muted-foreground` | `#66563F` | `#B4A48D` | Secondary text                                                      |
| `border`           | `#D9CBB4` | `#3B2E23` | Dividers, card borders                                              |
| `input`            | `#8A785D` | `#80705B` | Form borders (≥3:1) and the hover border of cards                   |
| `ink`              | `#1F1610` | `#0F0A07` | Footer band, photo-tile shade, tooltips (`ink-accent` on it)        |
| `success`          | `#46693A` | `#9CC48A` | Leading bid (olive); filled (`success-foreground`) only for **won** |
| `warning`          | `#87570F` | `#E2AA60` | Ending soon, reserve not met, test-mode banner                      |
| `destructive`      | `#9B3A27` | `#EE9A84` | Outbid, errors, cancel                                              |

Each status color has a `-soft` background (`success-soft`, `warning-soft`, `destructive-soft`).

**Auction states** (color + icon + text, never color alone):

| State       | Look                                                       | Icon              |
| ----------- | ---------------------------------------------------------- | ----------------- |
| Leading     | `success` on `success-soft`                                | the paddle (mark) |
| Outbid      | `destructive` on `destructive-soft`                        | arrow down        |
| Ending soon | `warning` on `warning-soft`                                | clock             |
| Closed      | `muted-foreground` on `muted`                              | lock              |
| Won         | `success-foreground` on `success` (the only filled status) | award             |

**Rules**

- **One accent.** Bordo is the action and the price. Don't add hues for emphasis.
- Status colors are never the accent, and never the only signal.

## Typography

**Newsreader** (serif, variable 400–700, optical size 36) for headings and the wordmark;
**Public Sans** (variable 400–800) for text, UI and prices. Both self-hosted as single-file
subsets (Latin + Romanian) via `next/font/local`; see `src/assets/fonts/README.md`. Both were
checked for **ș/ț with comma-below (U+0218–U+021B)**; never use the cedilla forms ş/ţ.

| Style   | Tailwind                                             | Weight            |
| ------- | ---------------------------------------------------- | ----------------- |
| Display | `font-display text-display` (fluid 40–68 px)         | 560, −0.02em      |
| H1      | `font-display text-3xl`                              | 560, −0.015em     |
| H2      | `font-display text-2xl`                              | 560, −0.015em     |
| H3      | `text-lg font-semibold` (sans)                       | 600               |
| Body    | `text-base` / `text-sm`                              | 400, line 1.5–1.6 |
| Eyebrow | `text-xs font-semibold tracking-[0.07em] uppercase`  | 600               |
| Price   | `font-bold tracking-tight text-primary` + `<Price/>` | 700, tabular      |

`font-display`/`font-heading` default to weight 560 and −0.015em (`globals.css`). Emphasis in a
headline: `font-serif-italic italic` (loaded only where used). **Prices are never mono**: the
sans with tabular figures, formatted "12.500 RON" with the currency smaller and muted
(`<Price/>`). Countdowns use `tabular-nums` too.

## Logo

Geometry lives in `src/lib/brand/logo-geometry.ts` (64×64 grid, paddle path with the L as a
counter-wound hole, so it works on any background). The wordmark is one color, set in the
serif: outlines in `src/lib/brand/wordmark.ts` were generated from Newsreader SemiBold (optical
size 36) with opentype.js (40 units, tracking −0.015em, baseline 46, x = 70). In the app, use
`<Logo/>` and `<LogoMark/>` (`variant`: `brand`, `inverse` for ink bands, `mono`).

`pnpm icons` regenerates every static file:

| File                  | Use                           |
| --------------------- | ----------------------------- |
| `logo.svg`            | Default, on light backgrounds |
| `logo-reversed.svg`   | On dark backgrounds           |
| `logo-mono.svg`       | Single color (print, stamps)  |
| `logo-mono-white.svg` | Single color on photos/dark   |
| `logo-mark.svg`       | Icon only                     |
| `logo-mark-mono.svg`  | Icon only, single color       |

Favicon: `src/app/icon.svg` (lighter rose on dark browser chrome) + `favicon.ico`. App icons
(`apple-icon.png`, `public/icons/`): white paddle on bordo. OG template: `src/lib/brand/og.tsx`
(stone paper, large bordo paddle, serif title).

**Rules**

- Keep clear space of at least twice the handle width around the logo.
- Minimum size: 16 px for the mark, 96 px wide for the full logo.
- Use `inverse` on ink bands, `mono` on photos or saturated backgrounds.
- Don't straighten the paddle, stretch, recolor, outline or add shadows to the logo.

## Surfaces

The page is thick cotton paper under warm light: soft mottling, faint fibres and fine grain,
lit from the top corners and a little darker at the edges (`page-paper` + `page-light`, fixed
behind the content). Cards sit on it as cream sheets.
The hero sits on the plain paper; one dark "room" breaks the home page: "Cine suntem?".

On the first visit the site opens like a show: bordo velvet curtains with a bordo silk fringe
part, the bordo lacquer paddle rises into a soft spotlight with the wordmark in ivory, stays for
five seconds, sinks back, and the curtains close on the site. No gold or metal, and the light
stays low: calm, not flashy.

## Photography

Real photographs of objects carry the site: warm, close, a little worn, the way things look in an
auction room. They sit in **photo tiles**: the picture fills a rounded panel, a dark shade rises
under the text, a hairline mount runs inside the edge like a passe-partout, and the type is the
serif, set on the photo. Hover zooms the picture slowly. Layouts are magazine-like (a lead tile,
smaller tiles, a wide one). Auction cards keep their plain body but share the mount and the zoom,
and their titles are in the serif. Icons stay small and functional.

## Icons

**Phosphor Light** (MIT): thin, even lines that sit well next to Newsreader, like the marks in an
auction catalogue. One family, one weight across the site; `fill` only marks a chosen state
(saved heart, rating stars, active tab) and `bold` only tiny ticks. Icons are muted
(`text-muted-foreground`) unless they carry a status or an action. They come from
`src/components/icons.tsx`, generated by `pnpm icons:ui`.

## Shape, depth, motion

- **Radius:** 6 px (`rounded-md`) for buttons, fields, badges and chips; 8 px (`rounded-lg`)
  for cards, panels and dialogs. `rounded-full` only for avatars and dots.
- **No shadows on cards.** Hover changes the border (`hover:border-input`) or the background.
  `shadow-overlay` is reserved for floating layers: menus, dialogs, toasts.
- **Motion:** 150–250 ms, ease-out, `transform` and `opacity` only.
  - `animate-bump` + `animate-flash`: a new bid slides the price into place while the panel
    behind it lights up in the accent tint and fades.
  - `animate-raise`: the gavel lifts on the bid button hover.
  - `animate-rise`: entrances. Never on the LCP headline.
  - `prefers-reduced-motion` stops every animation and transition (`globals.css`).

## Components

- **Buttons** (6 px corners, 44 px default; `sm` 36, `lg` 48, `xl` 56, icon 40): `default` (bordo),
  `outline` (card + border, darker border on hover), `secondary`, `ghost`, `destructive`
  (outlined, red text), `ink`/`inverse` (on dark bands), `link`. One filled button per view:
  "Licitează" is always the primary action ("Cumpără acum" is `outline`).
- **Inputs:** 44 px, 6 px corners, card field with an `input` border (3:1); focus = accent border
  - soft halo. Errors use `aria-invalid` plus a message in `text-destructive` linked by
    `aria-describedby`.
- **Auction card:** 8 px corners, border, no shadow; 4:3 photo with a solid countdown chip
  (`warning` colors in the last hour), title, uppercase price label, price in `text-primary`.
  Sold items get the **"Adjudecat"** stamp (`<HammerStamp/>`).
- **Status badges** (`auction.status`): active → `live` (tint + bordo dot), sold → `ink`,
  unsold → `neutral`, cancelled → `danger`, draft → `outline`.
- **Focus:** a 2 px accent outline on every interactive element. Never remove it.

## Tone of voice

We sound like a friend who knows the ropes: clear, warm and to the point. We always use **"tu"**.

| Așa da ✓                                             | Așa nu ✗                                                     |
| ---------------------------------------------------- | ------------------------------------------------------------ |
| Ai fost depășit! Mai licitezi?                       | Oferta dumneavoastră a fost depășită de un alt utilizator.   |
| Felicitări, ai câștigat! Plătește în 3 zile.         | Licitația s-a finalizat cu succes. Vă rugăm efectuați plata. |
| Vei primi aproximativ 950 RON după comisionul de 5%. | Se aplică un comision conform termenilor.                    |

- **Short sentences, verbs first:** "Licitează", "Ridică paleta", "Pune la licitație".
- **Be transparent about money.** Always show the fee and the final amount.
- **Errors say what happened and what to do next.** Don't blame the user.
- **Minimal emoji.** At most one, only in celebratory messages.
