// Single source of truth for LiciTot color tokens.
// globals.css mirrors these values; src/lib/brand/tokens.test.ts keeps them in sync
// and asserts WCAG AA contrast for every text/background pair below.

export const colorTokens = {
  light: {
    background: "#FFFFFF",
    foreground: "#0F1B2D",
    card: "#FFFFFF",
    "card-foreground": "#0F1B2D",
    popover: "#FFFFFF",
    "popover-foreground": "#0F1B2D",
    primary: "#1D6FC2",
    "primary-foreground": "#FFFFFF",
    "primary-hover": "#1A66B3",
    secondary: "#E8F4FD",
    "secondary-foreground": "#0B4A85",
    muted: "#F3F7FB",
    "muted-foreground": "#52627A",
    accent: "#E8F4FD",
    "accent-foreground": "#0B3A66",
    sky: "#8EC9F5",
    "sky-soft": "#E8F4FD",
    "sky-foreground": "#0B3A66",
    border: "#DCE5EF",
    input: "#7C8DA3",
    ring: "#1D6FC2",
    destructive: "#C2281D",
    "destructive-soft": "#FDECEA",
    success: "#157F3D",
    "success-soft": "#E7F6EC",
    warning: "#A15C07",
    "warning-soft": "#FEF4E2",
  },
  dark: {
    background: "#0B1320",
    foreground: "#E6EEF7",
    card: "#111C2C",
    "card-foreground": "#E6EEF7",
    popover: "#111C2C",
    "popover-foreground": "#E6EEF7",
    primary: "#8EC9F5",
    "primary-foreground": "#0B1320",
    "primary-hover": "#A9D6F8",
    secondary: "#16304D",
    "secondary-foreground": "#DCEBFA",
    muted: "#16233A",
    "muted-foreground": "#9DB0C7",
    accent: "#16304D",
    "accent-foreground": "#DCEBFA",
    sky: "#8EC9F5",
    "sky-soft": "#13283F",
    "sky-foreground": "#0B1320",
    border: "#22324A",
    input: "#5A6F8C",
    ring: "#8EC9F5",
    destructive: "#F87171",
    "destructive-soft": "#3A1518",
    success: "#4ADE80",
    "success-soft": "#0F2E1D",
    warning: "#FBBF24",
    "warning-soft": "#33260A",
  },
} as const

export type Theme = keyof typeof colorTokens
export type ColorToken = keyof (typeof colorTokens)["light"]

type Pair = { fg: ColorToken; bg: ColorToken; kind: "text" | "ui" }

/** Every foreground/background combination the UI actually uses. */
export const contrastPairs: Pair[] = [
  { fg: "foreground", bg: "background", kind: "text" },
  { fg: "card-foreground", bg: "card", kind: "text" },
  { fg: "popover-foreground", bg: "popover", kind: "text" },
  { fg: "muted-foreground", bg: "background", kind: "text" },
  { fg: "muted-foreground", bg: "muted", kind: "text" },
  { fg: "muted-foreground", bg: "card", kind: "text" },
  { fg: "primary", bg: "background", kind: "text" },
  { fg: "primary", bg: "card", kind: "text" },
  { fg: "primary-foreground", bg: "primary", kind: "text" },
  { fg: "primary-foreground", bg: "primary-hover", kind: "text" },
  { fg: "secondary-foreground", bg: "secondary", kind: "text" },
  { fg: "accent-foreground", bg: "accent", kind: "text" },
  { fg: "sky-foreground", bg: "sky", kind: "text" },
  { fg: "destructive", bg: "background", kind: "text" },
  { fg: "destructive", bg: "destructive-soft", kind: "text" },
  { fg: "success", bg: "background", kind: "text" },
  { fg: "success", bg: "success-soft", kind: "text" },
  { fg: "warning", bg: "background", kind: "text" },
  { fg: "warning", bg: "warning-soft", kind: "text" },
  { fg: "input", bg: "background", kind: "ui" },
  { fg: "ring", bg: "background", kind: "ui" },
]

/** Brand palette shown on /brand (names and usage live in messages: brand.swatches.*). */
export const brandSwatches = [
  "background",
  "sky",
  "sky-soft",
  "primary",
  "foreground",
  "muted-foreground",
  "border",
  "success",
  "warning",
  "destructive",
] as const satisfies readonly ColorToken[]
