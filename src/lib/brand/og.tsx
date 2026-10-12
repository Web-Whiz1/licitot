import { readFile } from "node:fs/promises"
import path from "node:path"
import { ImageResponse } from "next/og"
import { ARROW_PATH, ARROW_STROKE_WIDTH, LOGO_COLORS, TAG_PATH } from "./logo-geometry"
import { colorTokens } from "./tokens"

export const OG_SIZE = { width: 1200, height: 630 }

// Full (non-subset) Plus Jakarta Sans TTFs, OFL-licensed, so every Romanian diacritic
// (ă â î ș ț) comes from the same font file. Subset files make Satori fall back per glyph.
const FONT_FILES = [
  { file: "PlusJakartaSans-ExtraBold.ttf", weight: 800 },
  { file: "PlusJakartaSans-SemiBold.ttf", weight: 600 },
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
    return { name: "Jakarta", data: data as ArrayBuffer, weight, style: "normal" as const }
  })
}

/**
 * Brand OG template: baby-blue canvas, logo top-left, big title, optional subtitle/eyebrow.
 * Reused by the site default and (Phase 8) per-auction images.
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
        flexDirection: "column",
        justifyContent: "space-between",
        padding: 72,
        background: c["sky-soft"],
        fontFamily: "Jakarta",
        color: c.foreground,
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 20 }}>
        <svg width="88" height="88" viewBox="0 0 64 64">
          <path d={TAG_PATH} fill={LOGO_COLORS.tag} fillRule="evenodd" />
          <path
            d={ARROW_PATH}
            fill="none"
            stroke={LOGO_COLORS.arrow}
            strokeWidth={ARROW_STROKE_WIDTH}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
        <div style={{ display: "flex", fontSize: 56, fontWeight: 800, letterSpacing: -1.5 }}>
          <span>Lici</span>
          <span style={{ color: c.primary }}>Tot</span>
        </div>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
        {eyebrow ? (
          <div style={{ display: "flex", fontSize: 30, fontWeight: 600, color: c.primary }}>
            {eyebrow}
          </div>
        ) : null}
        <div
          style={{
            display: "flex",
            fontSize: title.length > 40 ? 64 : 84,
            fontWeight: 800,
            lineHeight: 1.1,
            letterSpacing: -2,
          }}
        >
          {title}
        </div>
        {subtitle ? (
          <div
            style={{ display: "flex", fontSize: 32, fontWeight: 600, color: c["muted-foreground"] }}
          >
            {subtitle}
          </div>
        ) : null}
      </div>

      <div
        style={{
          display: "flex",
          height: 14,
          borderRadius: 7,
          background: `linear-gradient(90deg, ${c.sky}, ${c.primary})`,
        }}
      />
    </div>,
    { ...OG_SIZE, fonts: await loadFonts() },
  )
}
