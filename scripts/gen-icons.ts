// Generates every static brand asset from src/lib/brand/logo-geometry.ts.
// Run with `pnpm icons` after changing the logo. Outputs are committed.
import { mkdir, writeFile } from "node:fs/promises"
import path from "node:path"
import sharp from "sharp"
import { fullLogoSvg, LOGO_COLORS, markSvg, monoMarkSvg } from "../src/lib/brand/logo-geometry"

const root = path.resolve(import.meta.dirname, "..")
const out = (...p: string[]) => path.join(root, ...p)

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

async function main() {
  await mkdir(out("public/brand"), { recursive: true })
  await mkdir(out("public/icons"), { recursive: true })

  const files: [string, string | Buffer][] = [
    // Vector logos
    ["public/brand/logo.svg", fullLogoSvg()],
    [
      "public/brand/logo-reversed.svg",
      fullLogoSvg({ ink: LOGO_COLORS.inkReversed, accent: LOGO_COLORS.accentReversed }),
    ],
    ["public/brand/logo-mono.svg", fullLogoSvg({ mono: LOGO_COLORS.ink })],
    ["public/brand/logo-mono-white.svg", fullLogoSvg({ mono: "#FFFFFF" })],
    ["public/brand/logo-mark.svg", markSvg()],
    ["public/brand/logo-mark-mono.svg", monoMarkSvg(LOGO_COLORS.ink)],
    // Favicon (SVG for modern browsers, ICO fallback)
    ["src/app/icon.svg", markSvg()],
    [
      "src/app/favicon.ico",
      ico(
        await Promise.all(
          [16, 32, 48].map(async (size) => ({ size, data: await png(markSvg(), size) })),
        ),
      ),
    ],
    // Apple touch icon: opaque white square, mark centered with breathing room
    ["src/app/apple-icon.png", await png(markSvg({ background: "#FFFFFF", padding: 10 }), 180)],
    // PWA icons
    ["public/icons/icon-192.png", await png(markSvg({ background: "#FFFFFF", padding: 6 }), 192)],
    ["public/icons/icon-512.png", await png(markSvg({ background: "#FFFFFF", padding: 6 }), 512)],
    // Maskable: content inside the central 80% safe zone
    [
      "public/icons/icon-maskable-512.png",
      await png(markSvg({ background: "#E8F4FD", padding: 18 }), 512),
    ],
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
