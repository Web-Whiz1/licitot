// LiciTot mark: a price tag whose silhouette is an upward arrow, with an arrow inside.
// "The price goes up with every bid." Drawn on a 64×64 grid.
// Shared by the React <Logo/>, the OG image and scripts/gen-icons.ts.

export const MARK_VIEWBOX = "0 0 64 64"

/** Tag outline + punched hole (use fill-rule="evenodd"). */
export const TAG_PATH =
  "M28.6 7.4Q32 4.4 35.4 7.4L50.4 21.3Q52 22.8 52 25V53Q52 59 46 59H18Q12 59 12 53V25Q12 22.8 13.6 21.3Z" +
  "M32 14.4A3.6 3.6 0 1 0 32 21.6A3.6 3.6 0 1 0 32 14.4Z"

/** Upward arrow, drawn as a stroke. */
export const ARROW_PATH = "M32 51V31M23.5 39.5L32 31L40.5 39.5"
export const ARROW_STROKE_WIDTH = 5.5

export const LOGO_COLORS = {
  tag: "#8EC9F5",
  arrow: "#1D6FC2",
  ink: "#0F1B2D",
  inkReversed: "#FFFFFF",
  accentReversed: "#8EC9F5",
  navy: "#0B1320",
} as const

type MarkOptions = {
  tag?: string
  arrow?: string
  /** Optional square background (for app icons). */
  background?: string
  /** Extra padding around the 64-unit artwork, in grid units (maskable icons need ~20%). */
  padding?: number
  /** Corner radius of the background square, in grid units. */
  backgroundRadius?: number
}

/** Standalone SVG markup for the mark (used to generate static assets). */
export function markSvg({
  tag = LOGO_COLORS.tag,
  arrow = LOGO_COLORS.arrow,
  background,
  padding = 0,
  backgroundRadius = 0,
}: MarkOptions = {}): string {
  const size = 64 + padding * 2
  const bg = background
    ? `<rect width="${size}" height="${size}" rx="${backgroundRadius}" fill="${background}"/>`
    : ""
  return [
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${size} ${size}" width="${size}" height="${size}">`,
    bg,
    `<g transform="translate(${padding} ${padding})">`,
    `<path d="${TAG_PATH}" fill="${tag}" fill-rule="evenodd"/>`,
    `<path d="${ARROW_PATH}" fill="none" stroke="${arrow}" stroke-width="${ARROW_STROKE_WIDTH}" stroke-linecap="round" stroke-linejoin="round"/>`,
    `</g></svg>`,
  ].join("")
}

/** Single-color mark: the arrow is knocked out of the tag so it works on any background. */
export function monoMarkSvg(color = "currentColor"): string {
  return [
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${MARK_VIEWBOX}" width="64" height="64">`,
    `<defs><mask id="lt-knockout" maskUnits="userSpaceOnUse" x="0" y="0" width="64" height="64">`,
    `<rect width="64" height="64" fill="#fff"/>`,
    `<path d="${ARROW_PATH}" fill="none" stroke="#000" stroke-width="${ARROW_STROKE_WIDTH}" stroke-linecap="round" stroke-linejoin="round"/>`,
    `</mask></defs>`,
    `<path d="${TAG_PATH}" fill="${color}" fill-rule="evenodd" mask="url(#lt-knockout)"/>`,
    `</svg>`,
  ].join("")
}

/**
 * Full horizontal logo (mark + wordmark) as standalone SVG. The wordmark uses live text with
 * a font stack; in the app the <Logo/> component renders it with the loaded web font instead.
 */
export function fullLogoSvg({
  ink = LOGO_COLORS.ink,
  accent = LOGO_COLORS.arrow,
  tag = LOGO_COLORS.tag,
  arrow = LOGO_COLORS.arrow,
  mono,
}: {
  ink?: string
  accent?: string
  tag?: string
  arrow?: string
  mono?: string
} = {}): string {
  const fontStack = "'Plus Jakarta Sans', Inter, 'Segoe UI', system-ui, sans-serif"
  const mark = mono
    ? `<defs><mask id="lt-knockout" maskUnits="userSpaceOnUse" x="0" y="0" width="64" height="64"><rect width="64" height="64" fill="#fff"/><path d="${ARROW_PATH}" fill="none" stroke="#000" stroke-width="${ARROW_STROKE_WIDTH}" stroke-linecap="round" stroke-linejoin="round"/></mask></defs><path d="${TAG_PATH}" fill="${mono}" fill-rule="evenodd" mask="url(#lt-knockout)"/>`
    : `<path d="${TAG_PATH}" fill="${tag}" fill-rule="evenodd"/><path d="${ARROW_PATH}" fill="none" stroke="${arrow}" stroke-width="${ARROW_STROKE_WIDTH}" stroke-linecap="round" stroke-linejoin="round"/>`
  return [
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 232 64" width="232" height="64">`,
    mark,
    `<text x="74" y="46" font-family="${fontStack}" font-size="38" font-weight="800" letter-spacing="-1">`,
    `<tspan fill="${mono ?? ink}">Lici</tspan><tspan fill="${mono ?? accent}">Tot</tspan>`,
    `</text></svg>`,
  ].join("")
}
