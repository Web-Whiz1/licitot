import { readFile } from "node:fs/promises"
import path from "node:path"
import { ImageResponse } from "next/og"
import { LIVE_DOT, LOGO_COLORS, PADDLE_PATH, PADDLE_TRANSFORM } from "./logo-geometry"
import { colorTokens } from "./tokens"

export const OG_SIZE = { width: 1200, height: 630 }

// Static TrueType instance (Satori reads neither woff2 nor variable fonts), subset like the
// web fonts so every Romanian diacritic comes from the same file (src/assets/fonts/README.md).
// Fraunces only: Satori adds stray gaps after some letters with Geist's spacing tables.
const FONT_FILES = [
  { file: "Fraunces-SemiBold-Display.ttf", name: "Fraunces", weight: 600 },
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
  return FONT_FILES.map(({ name, weight }, i) => {
    const bytes = Buffer.from(files[i]!, "base64")
    // Satori requires a standalone ArrayBuffer, not a view into a larger one.
    const data = bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength)
    return { name, data: data as ArrayBuffer, weight, style: "normal" as const }
  })
}

function Paddle({ size, paddle, dot }: { size: number; paddle: string; dot: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 64 64">
      <path d={PADDLE_PATH} transform={PADDLE_TRANSFORM} fill={paddle} />
      <circle cx={LIVE_DOT.cx} cy={LIVE_DOT.cy} r={LIVE_DOT.r} fill={dot} />
    </svg>
  )
}

/**
 * Brand OG template: a midnight stage with a giant Klein-blue paddle, the logo top-left and the
 * title in Fraunces. Reused by the site default and (later) per-auction images.
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
        backgroundColor: c.ink,
        color: c["ink-foreground"],
        fontFamily: "Fraunces",
      }}
    >
      {/* Spotlight behind the paddle (an SVG gradient: Satori clips CSS radial gradients) */}
      <svg
        width="1100"
        height="1100"
        viewBox="0 0 100 100"
        style={{ position: "absolute", right: -330, top: -380 }}
      >
        <defs>
          <radialGradient id="spot">
            <stop offset="0%" stopColor={LOGO_COLORS.paddle} stopOpacity="0.6" />
            <stop offset="100%" stopColor={LOGO_COLORS.paddle} stopOpacity="0" />
          </radialGradient>
        </defs>
        <circle cx="50" cy="50" r="50" fill="url(#spot)" />
      </svg>
      <div style={{ position: "absolute", right: -30, bottom: -120, display: "flex" }}>
        <Paddle size={600} paddle={LOGO_COLORS.paddle} dot={LOGO_COLORS.dot} />
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
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <Paddle size={76} paddle={c["ink-accent"]} dot={c.highlight} />
          <div style={{ display: "flex", fontFamily: "Fraunces", fontSize: 54, letterSpacing: -1 }}>
            <span>Lici</span>
            <span style={{ color: c["ink-accent"] }}>Tot</span>
          </div>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 22, maxWidth: 700 }}>
          {eyebrow ? (
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 12,
                fontSize: 26,
                letterSpacing: 2,
                textTransform: "uppercase",
                color: c.highlight,
              }}
            >
              <div
                style={{ width: 14, height: 14, borderRadius: 9999, backgroundColor: c.highlight }}
              />
              {eyebrow}
            </div>
          ) : null}
          <div
            style={{
              display: "flex",
              fontFamily: "Fraunces",
              fontSize: title.length > 40 ? 72 : 100,
              lineHeight: 1.02,
              letterSpacing: title.length > 40 ? -2 : -3.5,
            }}
          >
            {title}
          </div>
          {subtitle ? (
            <div
              style={{
                display: "flex",
                fontSize: 34,
                lineHeight: 1.3,
                color: c["ink-muted"],
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
