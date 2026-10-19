// LiciTot mark: a raised bidding paddle. The "L" is cut out of the paddle (it also reads as
// the hands of a clock: every auction races the clock) and the lime dot is the "live" signal.
// Drawn on a 64×64 grid. Shared by <Logo/>, the OG image and scripts/gen-icons.ts.

export const MARK_VIEWBOX = "0 0 64 64"

/** The paddle leans 10° forward, like a hand raising it. */
export const PADDLE_TRANSFORM = "rotate(10 32 34)"

/**
 * Paddle head and handle (clockwise) plus the "L" (counter-clockwise). With the default
 * nonzero fill rule the L is a real hole, so the mark works on any background.
 */
export const PADDLE_PATH =
  "M27 5H37A14 14 0 0 1 51 19V27A14 14 0 0 1 37 41H27A14 14 0 0 1 13 27V19A14 14 0 0 1 27 5Z" +
  "M28 37H36V55A4 4 0 0 1 28 55Z" +
  "M23.25 14V31A3.25 3.25 0 0 0 26.5 34.25H39.5A3.25 3.25 0 0 0 39.5 27.75H29.75V14A3.25 3.25 0 0 0 23.25 14Z"

/** The lime "live" dot, outside the paddle's top-right corner. */
export const LIVE_DOT = { cx: 56.5, cy: 7.5, r: 5 } as const

/** Fixed colors for static assets. In the app the mark follows the theme tokens instead. */
export const LOGO_COLORS = {
  paddle: "#1F3BDB",
  paddleOnDark: "#93A2FF",
  dot: "#D2F45C",
  ink: "#0F1530",
  paper: "#F7F5F0",
} as const

function markShapes(paddle: string, dot: string): string {
  return [
    `<path class="paddle" d="${PADDLE_PATH}" fill="${paddle}" transform="${PADDLE_TRANSFORM}"/>`,
    `<circle cx="${LIVE_DOT.cx}" cy="${LIVE_DOT.cy}" r="${LIVE_DOT.r}" fill="${dot}"/>`,
  ].join("")
}

type MarkOptions = {
  paddle?: string
  /** Paddle color when the system is in dark mode (favicons on dark browser chrome). */
  paddleDark?: string
  dot?: string
  /** Optional square background (for app icons). */
  background?: string
  /** Extra padding around the 64-unit artwork, in grid units (maskable icons need ~20%). */
  padding?: number
  /** Corner radius of the background square, in grid units. */
  backgroundRadius?: number
}

/** Standalone SVG markup for the mark (used to generate static assets). */
export function markSvg({
  paddle = LOGO_COLORS.paddle,
  paddleDark,
  dot = LOGO_COLORS.dot,
  background,
  padding = 0,
  backgroundRadius = 0,
}: MarkOptions = {}): string {
  const size = 64 + padding * 2
  const bg = background
    ? `<rect width="${size}" height="${size}" rx="${backgroundRadius}" fill="${background}"/>`
    : ""
  const style = paddleDark
    ? `<style>@media (prefers-color-scheme: dark){.paddle{fill:${paddleDark}}}</style>`
    : ""
  return [
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${size} ${size}" width="${size}" height="${size}">`,
    style,
    bg,
    `<g transform="translate(${padding} ${padding})">${markShapes(paddle, dot)}</g>`,
    `</svg>`,
  ].join("")
}

/** Single-color mark (the L stays a hole, so it works on any background). */
export function monoMarkSvg(color = "currentColor"): string {
  return markSvg({ paddle: color, dot: color })
}

/**
 * Full horizontal logo (mark + outlined wordmark) as standalone SVG. The wordmark paths come
 * from ./wordmark.ts, so the file renders the same everywhere without the web font.
 */
export function fullLogoSvg(
  wordmark: { width: number; lici: string; tot: string },
  {
    paddle = LOGO_COLORS.paddle,
    dot = LOGO_COLORS.dot,
    lici = LOGO_COLORS.ink,
    tot = LOGO_COLORS.paddle,
  }: { paddle?: string; dot?: string; lici?: string; tot?: string } = {},
): string {
  return [
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${wordmark.width} 64" width="${wordmark.width}" height="64">`,
    markShapes(paddle, dot),
    `<path d="${wordmark.lici}" fill="${lici}"/>`,
    `<path d="${wordmark.tot}" fill="${tot}"/>`,
    `</svg>`,
  ].join("")
}
