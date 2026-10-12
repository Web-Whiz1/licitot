// All money in LiciTot is an integer number of bani (1 RON = 100 bani). Never use floats
// for stored or computed amounts; convert only at the edges (input parsing, display).

export const PLATFORM_FEE_PERCENT = 5

const ronFormatter = new Intl.NumberFormat("ro-RO", {
  style: "currency",
  currency: "RON",
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
})

const ronWholeFormatter = new Intl.NumberFormat("ro-RO", {
  style: "currency",
  currency: "RON",
  minimumFractionDigits: 0,
  maximumFractionDigits: 0,
})

function assertBani(bani: number): void {
  if (!Number.isSafeInteger(bani)) throw new RangeError(`Sumă invalidă în bani: ${bani}`)
}

/** 123456 → "1.234,56 RON". Whole amounts drop the decimals when `compact` is set. */
export function formatRON(bani: number, { compact = false }: { compact?: boolean } = {}): string {
  assertBani(bani)
  if (compact && bani % 100 === 0) return ronWholeFormatter.format(bani / 100)
  return ronFormatter.format(bani / 100)
}

/**
 * Parses user input in RON ("1.234,56", "1234.5", "1 234", "12,5 lei") into bani.
 * Returns null for anything that is not a non-negative amount with at most 2 decimals.
 */
export function parseRONToBani(input: string): number | null {
  const s = input
    .trim()
    .replace(/(ron|lei)$/i, "")
    .replace(/[\s  ]/g, "")
  if (!/^\d[\d.,]*$/.test(s)) return null

  // Decide which separator (if any) is the decimal one:
  // - both present → the last one is decimal ("1.234,56" / "1,234.56")
  // - one kind, repeated → thousands only ("1.234.567")
  // - one kind, once, followed by exactly 3 digits → thousands ("1.234"; amounts have ≤2 decimals)
  // - otherwise it is decimal ("12,5" / "12.50")
  const lastSep = Math.max(s.lastIndexOf(","), s.lastIndexOf("."))
  let intPart = s
  let frac = ""
  if (lastSep !== -1) {
    const sep = s[lastSep]!
    const hasBoth = s.includes(",") && s.includes(".")
    const sepCount = s.split(sep).length - 1
    const digitsAfter = s.length - lastSep - 1
    if (hasBoth || (sepCount === 1 && digitsAfter !== 3)) {
      intPart = s.slice(0, lastSep)
      frac = s.slice(lastSep + 1)
    }
  }

  // Integer part: plain digits, or correctly grouped thousands with one consistent separator.
  if (!/^\d+$/.test(intPart) && !/^\d{1,3}([.,])\d{3}(?:\1\d{3})*$/.test(intPart)) return null
  if (!/^\d{0,2}$/.test(frac) || (lastSep === s.length - 1 && frac === "")) return null

  const whole = intPart.replace(/[.,]/g, "")
  const bani = Number(whole) * 100 + Number(frac.padEnd(2, "0"))
  return Number.isSafeInteger(bani) ? bani : null
}

/** Platform fee on the hammer price, rounded half-up to the nearest ban. */
export function calcPlatformFee(bani: number): number {
  assertBani(bani)
  if (bani < 0) throw new RangeError("Suma nu poate fi negativă")
  return Math.floor((bani * PLATFORM_FEE_PERCENT + 50) / 100)
}

/** What the seller receives for the item (shipping is passed through untouched). */
export function calcSellerPayout(bani: number): number {
  return bani - calcPlatformFee(bani)
}
