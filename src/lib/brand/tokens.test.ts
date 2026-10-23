import { readFileSync } from "node:fs"
import path from "node:path"
import { describe, expect, it } from "vitest"
import { AA_TEXT, AA_UI, contrastRatio } from "./contrast"
import { colorTokens, contrastPairs, type Theme } from "./tokens"

const css = readFileSync(path.resolve(import.meta.dirname, "../../app/globals.css"), "utf8")

function cssBlockVars(selector: string): Record<string, string> {
  const start = css.indexOf(`${selector} {`)
  if (start === -1) throw new Error(`Missing ${selector} block in globals.css`)
  const body = css.slice(start, css.indexOf("}", start))
  return Object.fromEntries(
    [...body.matchAll(/--([\w-]+):\s*(#[0-9a-f]{6});/gi)].map((m) => [m[1]!, m[2]!.toUpperCase()]),
  )
}

const cssVars: Record<Theme, Record<string, string>> = {
  light: cssBlockVars(":root"),
  dark: cssBlockVars(".dark"),
}

describe.each(["light", "dark"] as const)("%s theme", (theme) => {
  const tokens = colorTokens[theme]

  it("globals.css matches tokens.ts", () => {
    for (const [name, value] of Object.entries(tokens)) {
      expect(cssVars[theme][name], `--${name}`).toBe(value)
    }
  })

  it.each(contrastPairs)("$fg on $bg meets WCAG AA", ({ fg, bg, kind }) => {
    const ratio = contrastRatio(tokens[fg], tokens[bg])
    expect(ratio).toBeGreaterThanOrEqual(kind === "text" ? AA_TEXT : AA_UI)
  })
})

describe("contrastRatio", () => {
  it("is 21 for black on white and symmetric", () => {
    expect(contrastRatio("#000000", "#FFFFFF")).toBeCloseTo(21, 5)
    expect(contrastRatio("#FFFFFF", "#000000")).toBeCloseTo(21, 5)
  })
})

describe("statuses", () => {
  it.each(["light", "dark"] as const)("never reuse the accent color (%s)", (theme) => {
    const c = colorTokens[theme]
    for (const status of ["success", "warning", "destructive"] as const) {
      expect(c[status]).not.toBe(c.primary)
    }
  })
})
