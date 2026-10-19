import { readFile } from "node:fs/promises"
import path from "node:path"
import { ImageResponse } from "next/og"
import { LOGO_COLORS, PADDLE_PATH, PADDLE_TRANSFORM } from "./logo-geometry"
import { colorTokens } from "./tokens"

export const OG_SIZE = { width: 1200, height: 630 }

// Static Geist instances re-saved without GSUB (Satori mis-measures words with Geist's
// contextual substitutions), subset like the web font (src/assets/fonts/README.md).
const FONT_FILES = [
  { file: "Geist-Bold-OG.otf", weight: 700 },
  { file: "Geist-Medium-OG.otf", weight: 500 },
] as const

// Cached so OG routes can be prerendered (file reads count as uncached I/O otherwise).
// Base64 strings round-trip through the cache reliably; binary views do not.
async function readFontFiles(): Promise<string[]> {
  "use cache"
  const dir = path.join(process.cwd(), "src/assets/fonts")
  return Promise.all(FONT_FILES.map(({ file }) => readFile(path.join(dir, file), "base64")))
}

async function loadFonts() {
  const files = await readFontFiles()
  return FONT_FILES.map(({ weight }, i) => {
    const bytes = Buffer.from(files[i]!, "base64")
    // Satori requires a standalone ArrayBuffer, not a view into a larger one.
    const data = bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength)
    return { name: "Geist", data: data as ArrayBuffer, weight, style: "normal" as const }
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
 * Brand OG template: a light blue gradient sky with a giant brand-blue paddle, the logo
 * top-left and a bold Geist title. Reused by the site default and (later) per-auction images.
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
        backgroundImage: `linear-gradient(160deg, ${c["hero-from"]} 0%, ${c["hero-via"]} 50%, ${c["hero-to"]} 100%)`,
        color: c.foreground,
        fontFamily: "Geist",
      }}
    >
      {/* Soft white glow behind the paddle (an SVG gradient: Satori clips CSS radial ones) */}
      <svg
        width="900"
        height="900"
        viewBox="0 0 100 100"
        style={{ position: "absolute", right: -250, top: -300 }}
      >
        <defs>
          <radialGradient id="glow">
            <stop offset="0%" stopColor="#FFFFFF" stopOpacity="0.9" />
            <stop offset="100%" stopColor="#FFFFFF" stopOpacity="0" />
          </radialGradient>
        </defs>
        <circle cx="50" cy="50" r="50" fill="url(#glow)" />
      </svg>
      <div style={{ position: "absolute", right: -20, bottom: -130, display: "flex" }}>
        <Paddle size={600} fill={LOGO_COLORS.paddle} />
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
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <Paddle size={72} fill={LOGO_COLORS.paddle} />
          <div style={{ display: "flex", fontSize: 50, fontWeight: 700, letterSpacing: -1.8 }}>
            <span>Lici</span>
            <span style={{ color: c.primary }}>Tot</span>
          </div>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 20, maxWidth: 720 }}>
          {eyebrow ? (
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 12,
                fontSize: 26,
                fontWeight: 700,
                color: c.primary,
              }}
            >
              <div style={{ width: 14, height: 14, borderRadius: 9999, backgroundColor: c.live }} />
              {eyebrow}
            </div>
          ) : null}
          <div
            style={{
              display: "flex",
              fontSize: title.length > 40 ? 72 : 100,
              fontWeight: 700,
              lineHeight: 1,
              letterSpacing: title.length > 40 ? -2.5 : -4.5,
            }}
          >
            {title}
          </div>
          {subtitle ? (
            <div
              style={{
                display: "flex",
                fontSize: 34,
                fontWeight: 500,
                lineHeight: 1.3,
                color: c["hero-muted"],
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
