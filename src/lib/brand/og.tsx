import { readFile } from "node:fs/promises"
import path from "node:path"
import { ImageResponse } from "next/og"
import { SITE_URL } from "@/lib/site"
import { LOGO_COLORS, PADDLE_PATH, PADDLE_TRANSFORM } from "./logo-geometry"
import { colorTokens } from "./tokens"

export const OG_SIZE = { width: 1200, height: 630 }

// Static Newsreader / Public Sans instances re-saved without GSUB (Satori mis-measures
// substituted glyphs), subset like the web fonts (src/assets/fonts/README.md).
// They live in public/fonts/: serverless functions don't ship public files, so when an OG
// image is regenerated at runtime the font is fetched from the site itself.
const FONT_FILES = [
  { file: "Newsreader-SemiBold-OG.otf", name: "Newsreader", weight: 600 },
  { file: "PublicSans-Bold-OG.otf", name: "Public Sans", weight: 700 },
  { file: "PublicSans-Medium-OG.otf", name: "Public Sans", weight: 500 },
] as const

async function fontBase64(file: string): Promise<string> {
  try {
    // Build time: read from disk.
    return await readFile(path.join(process.cwd(), "public/fonts", file), "base64")
  } catch {
    // Serverless runtime: fetch the public copy.
    const res = await fetch(`${SITE_URL}/fonts/${file}`)
    if (!res.ok) throw new Error(`OG font ${file}: HTTP ${res.status}`)
    return Buffer.from(await res.arrayBuffer()).toString("base64")
  }
}

// Cached so OG routes can be prerendered (file reads count as uncached I/O otherwise).
// Base64 strings round-trip through the cache reliably; binary views do not.
async function readFontFiles(): Promise<string[]> {
  "use cache"
  return Promise.all(FONT_FILES.map(({ file }) => fontBase64(file)))
}

async function loadFonts() {
  const files = await readFontFiles()
  return FONT_FILES.map(({ name, weight }, i) => {
    const bytes = Buffer.from(files[i]!, "base64")
    // Satori requires a standalone ArrayBuffer, not a view into a larger one.
    const data = bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength)
    return { name, data: data as ArrayBuffer, weight, style: "normal" as const }
  })
}

function Paddle({ size, fill }: { size: number; fill: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 64 64">
      <path d={PADDLE_PATH} transform={PADDLE_TRANSFORM} fill={fill} />
    </svg>
  )
}

/**
 * Brand OG template: warm stone paper, a large bordo paddle leaning in from the bottom right,
 * the logo top-left and a serif title. Reused by the site default and per-page images.
 */
export async function brandOgImage({
  title,
  subtitle,
  eyebrow,
}: {
  title: string
  subtitle?: string
  eyebrow?: string
}) {
  const c = colorTokens.light
  return new ImageResponse(
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        position: "relative",
        overflow: "hidden",
        backgroundColor: c.background,
        color: c.foreground,
        fontFamily: "Public Sans",
      }}
    >
      <div style={{ position: "absolute", right: -40, bottom: -150, display: "flex" }}>
        <Paddle size={620} fill={LOGO_COLORS.paddle} />
      </div>

      <div
        style={{
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          width: "100%",
          height: "100%",
          padding: 72,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <Paddle size={68} fill={LOGO_COLORS.paddle} />
          <div
            style={{
              display: "flex",
              fontFamily: "Newsreader",
              fontSize: 54,
              fontWeight: 600,
              letterSpacing: -0.8,
            }}
          >
            LiciTot
          </div>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 22, maxWidth: 700 }}>
          {eyebrow ? (
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 12,
                fontSize: 24,
                fontWeight: 700,
                letterSpacing: 2,
                textTransform: "uppercase",
                color: c.primary,
              }}
            >
              <div
                style={{ width: 12, height: 12, borderRadius: 9999, backgroundColor: c.primary }}
              />
              {eyebrow}
            </div>
          ) : null}
          <div
            style={{
              display: "flex",
              fontFamily: "Newsreader",
              fontSize: title.length > 40 ? 76 : 104,
              fontWeight: 600,
              lineHeight: 1.02,
              letterSpacing: title.length > 40 ? -1.2 : -2,
            }}
          >
            {title}
          </div>
          {subtitle ? (
            <div
              style={{
                display: "flex",
                fontSize: 32,
                fontWeight: 500,
                lineHeight: 1.35,
                color: c["muted-foreground"],
              }}
            >
              {subtitle}
            </div>
          ) : null}
        </div>
      </div>
    </div>,
    { ...OG_SIZE, fonts: await loadFonts() },
  )
}
