// WCAG 2.x relative luminance + contrast ratio for #RRGGBB colors.

function channel(value: number): number {
  const c = value / 255
  return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4
}

export function luminance(hex: string): number {
  const m = /^#([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})$/i.exec(hex)
  if (!m) throw new Error(`Culoare invalidă: ${hex}`)
  const [r, g, b] = [m[1], m[2], m[3]].map((h) => channel(parseInt(h!, 16))) as [
    number,
    number,
    number,
  ]
  return 0.2126 * r + 0.7152 * g + 0.0722 * b
}

export function contrastRatio(a: string, b: string): number {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x) as [number, number]
  return (hi + 0.05) / (lo + 0.05)
}

/** AA thresholds: 4.5 for body text, 3 for large text and UI boundaries. */
export const AA_TEXT = 4.5
export const AA_UI = 3
