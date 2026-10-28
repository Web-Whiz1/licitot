// Single source of truth for LiciTot color tokens.
// globals.css mirrors these values; src/lib/brand/tokens.test.ts keeps them in sync
// and asserts WCAG AA contrast for every text/background pair below.
//
// "Casa de licitații", Pergament palette (chosen Oct 2026 to match the photographs): warm
// parchment paper, cream cards, walnut ink, one oxblood accent, and muted status colors that
// always come with an icon and a label. Dark mode is its own warm espresso room, not inverted:
// the accent turns to a lighter terracotta rose so it keeps contrast.

export const colorTokens = {
  light: {
    background: "#EDE5D6",
    foreground: "#241A12",
    card: "#F8F2E7",
    "card-foreground": "#241A12",
    popover: "#FBF7EF",
    "popover-foreground": "#241A12",
    primary: "#7A2A22",
    "primary-foreground": "#FBF4EA",
    "primary-hover": "#63211B",
    secondary: "#E4D9C6",
    "secondary-foreground": "#241A12",
    muted: "#E4D9C6",
    "muted-foreground": "#66563F",
    accent: "#E4D9C6",
    "accent-foreground": "#241A12",
    tint: "#F0DDD2",
    "tint-foreground": "#63211B",
    ink: "#1F1610",
    "ink-foreground": "#F3EADB",
    "ink-muted": "#B9A88F",
    "ink-accent": "#E3A08A",
    border: "#D9CBB4",
    input: "#8A785D",
    ring: "#7A2A22",
    destructive: "#9B3A27",
    "destructive-soft": "#F2E0D5",
    success: "#46693A",
    "success-foreground": "#FBF4EA",
    "success-soft": "#E3E8D4",
    warning: "#87570F",
    "warning-soft": "#F1E3C8",
  },
  dark: {
    background: "#17110D",
    foreground: "#EFE5D6",
    card: "#211913",
    "card-foreground": "#EFE5D6",
    popover: "#2A2019",
    "popover-foreground": "#EFE5D6",
    primary: "#D97A6C",
    "primary-foreground": "#1D0C09",
    "primary-hover": "#E6917F",
    secondary: "#2B2119",
    "secondary-foreground": "#EFE5D6",
    muted: "#2B2119",
    "muted-foreground": "#B4A48D",
    accent: "#33281F",
    "accent-foreground": "#EFE5D6",
    tint: "#3A201B",
    "tint-foreground": "#F3C6B9",
    ink: "#0F0A07",
    "ink-foreground": "#EFE5D6",
    "ink-muted": "#B4A48D",
    "ink-accent": "#E8957F",
    border: "#3B2E23",
    input: "#80705B",
    ring: "#D97A6C",
    destructive: "#EE9A84",
    "destructive-soft": "#33190F",
    success: "#9CC48A",
    "success-foreground": "#0F1A0B",
    "success-soft": "#1C2617",
    warning: "#E2AA60",
    "warning-soft": "#30230F",
  },
} as const

export type Theme = keyof typeof colorTokens
export type ColorToken = keyof (typeof colorTokens)["light"]

type Pair = { fg: ColorToken; bg: ColorToken; kind: "text" | "ui" }

/** Every foreground/background combination the UI actually uses. */
export const contrastPairs: Pair[] = [
  { fg: "foreground", bg: "background", kind: "text" },
  { fg: "foreground", bg: "muted", kind: "text" },
  { fg: "card-foreground", bg: "card", kind: "text" },
  { fg: "popover-foreground", bg: "popover", kind: "text" },
  { fg: "muted-foreground", bg: "background", kind: "text" },
  { fg: "muted-foreground", bg: "muted", kind: "text" },
  { fg: "muted-foreground", bg: "card", kind: "text" },
  { fg: "muted-foreground", bg: "popover", kind: "text" },
  { fg: "primary", bg: "background", kind: "text" },
  { fg: "primary", bg: "card", kind: "text" },
  { fg: "primary", bg: "tint", kind: "text" },
  { fg: "primary-foreground", bg: "primary", kind: "text" },
  { fg: "primary-foreground", bg: "primary-hover", kind: "text" },
  { fg: "secondary-foreground", bg: "secondary", kind: "text" },
  { fg: "accent-foreground", bg: "accent", kind: "text" },
  { fg: "tint-foreground", bg: "tint", kind: "text" },
  { fg: "ink-foreground", bg: "ink", kind: "text" },
  { fg: "ink-muted", bg: "ink", kind: "text" },
  { fg: "ink-accent", bg: "ink", kind: "text" },
  { fg: "destructive", bg: "background", kind: "text" },
  { fg: "destructive", bg: "card", kind: "text" },
  { fg: "destructive", bg: "destructive-soft", kind: "text" },
  { fg: "success", bg: "background", kind: "text" },
  { fg: "success", bg: "card", kind: "text" },
  { fg: "success", bg: "success-soft", kind: "text" },
  { fg: "success-foreground", bg: "success", kind: "text" },
  { fg: "warning", bg: "background", kind: "text" },
  { fg: "warning", bg: "card", kind: "text" },
  { fg: "warning", bg: "warning-soft", kind: "text" },
  { fg: "input", bg: "background", kind: "ui" },
  { fg: "input", bg: "card", kind: "ui" },
  { fg: "ring", bg: "background", kind: "ui" },
  { fg: "ring", bg: "card", kind: "ui" },
]

/** Brand palette shown on /brand (names and usage live in messages: brand.swatches.*). */
export const brandSwatches = [
  "primary",
  "tint",
  "foreground",
  "muted-foreground",
  "background",
  "card",
  "border",
  "ink",
  "success",
  "warning",
  "destructive",
] as const satisfies readonly ColorToken[]
