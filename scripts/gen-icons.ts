// Generates every static brand asset from src/lib/brand/logo-geometry.ts and wordmark.ts.
// Run with `pnpm icons` after changing the logo. Outputs are committed.
import { mkdir, writeFile } from "node:fs/promises"
import path from "node:path"
import sharp from "sharp"
import { fullLogoSvg, LOGO_COLORS, markSvg, monoMarkSvg } from "../src/lib/brand/logo-geometry"
import {
  WORDMARK_LICI_PATH,
  WORDMARK_TOT_PATH,
  WORDMARK_VIEWBOX_WIDTH,
} from "../src/lib/brand/wordmark"

const root = path.resolve(import.meta.dirname, "..")
const out = (...p: string[]) => path.join(root, ...p)

const wordmark = { width: WORDMARK_VIEWBOX_WIDTH, lici: WORDMARK_LICI_PATH, tot: WORDMARK_TOT_PATH }

async function png(svg: string, size: number): Promise<Buffer> {
  return sharp(Buffer.from(svg), { density: 600 }).resize(size, size).png().toBuffer()
}

/** ICO container with embedded PNG images (supported by every modern browser). */
function ico(images: { size: number; data: Buffer }[]): Buffer {
  const header = Buffer.alloc(6)
  header.writeUInt16LE(0, 0) // reserved
  header.writeUInt16LE(1, 2) // type: icon
  header.writeUInt16LE(images.length, 4)
  let offset = 6 + images.length * 16
  const entries = images.map(({ size, data }) => {
    const e = Buffer.alloc(16)
    e.writeUInt8(size >= 256 ? 0 : size, 0)
    e.writeUInt8(size >= 256 ? 0 : size, 1)
    e.writeUInt8(0, 2) // palette
    e.writeUInt8(0, 3) // reserved
    e.writeUInt16LE(1, 4) // color planes
    e.writeUInt16LE(32, 6) // bits per pixel
    e.writeUInt32LE(data.length, 8)
    e.writeUInt32LE(offset, 12)
    offset += data.length
    return e
  })
  return Buffer.concat([header, ...entries, ...images.map((i) => i.data)])
}

// App icons: white paddle on bordo; the L cut-out shows the bordo through.
const appIcon = (padding: number, backgroundRadius = 0) =>
  markSvg({ background: LOGO_COLORS.paddle, paddle: LOGO_COLORS.white, padding, backgroundRadius })

async function main() {
  await mkdir(out("public/brand"), { recursive: true })
  await mkdir(out("public/icons"), { recursive: true })

  const files: [string, string | Buffer][] = [
    // Vector logos (wordmark outlined: no font needed)
    ["public/brand/logo.svg", fullLogoSvg(wordmark)],
    [
      "public/brand/logo-reversed.svg",
      fullLogoSvg(wordmark, {
        paddle: LOGO_COLORS.paddleOnDark,
        lici: LOGO_COLORS.paper,
        tot: LOGO_COLORS.paper,
      }),
    ],
    [
      "public/brand/logo-mono.svg",
      fullLogoSvg(wordmark, {
        paddle: LOGO_COLORS.ink,
        lici: LOGO_COLORS.ink,
        tot: LOGO_COLORS.ink,
      }),
    ],
    [
      "public/brand/logo-mono-white.svg",
      fullLogoSvg(wordmark, { paddle: "#FFFFFF", lici: "#FFFFFF", tot: "#FFFFFF" }),
    ],
    ["public/brand/logo-mark.svg", markSvg()],
    ["public/brand/logo-mark-mono.svg", monoMarkSvg(LOGO_COLORS.ink)],
    // Favicon: SVG (switches to a lighter rose on dark browser chrome) + ICO fallback
    ["src/app/icon.svg", markSvg({ paddleDark: LOGO_COLORS.paddleOnDark })],
    [
      "src/app/favicon.ico",
      ico(
        await Promise.all(
          [16, 32, 48].map(async (size) => ({ size, data: await png(markSvg(), size) })),
        ),
      ),
    ],
    // Apple touch icon: opaque square (iOS rounds the corners itself)
    ["src/app/apple-icon.png", await png(appIcon(12), 180)],
    // PWA icons
    ["public/icons/icon-192.png", await png(appIcon(12, 20), 192)],
    ["public/icons/icon-512.png", await png(appIcon(12, 20), 512)],
    // Maskable: full-bleed background, artwork inside the central 80% safe zone
    ["public/icons/icon-maskable-512.png", await png(appIcon(22), 512)],
  ]

  for (const [file, data] of files) {
    await writeFile(out(file), data)
    console.log("✓", file)
  }
}

main().catch((err: unknown) => {
  console.error(err)
  process.exit(1)
})
