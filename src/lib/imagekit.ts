// ImageKit helpers shared by server and client. We store file *paths* ("/licitot/…"), never
// full URLs, and build delivery URLs with transformations here.

export const IMAGEKIT_ROOT = "/licitot"

export type UploadPurpose = "auction" | "avatar"

export const uploadFolder = (purpose: UploadPurpose, userId: string) =>
  `${IMAGEKIT_ROOT}/${purpose === "auction" ? "auctions" : "avatars"}/${userId}`

/** File names we generate: <uuid>.<ext>. Mirrors the auction_images.path CHECK constraint. */
export const IMAGE_PATH_PATTERN =
  /^\/licitot\/(auctions|avatars)\/[0-9a-f-]{36}\/[A-Za-z0-9._-]{1,200}$/

export function isOwnPath(path: string, purpose: UploadPurpose, userId: string): boolean {
  return IMAGE_PATH_PATTERN.test(path) && path.startsWith(`${uploadFolder(purpose, userId)}/`)
}

type Transform = {
  width?: number
  height?: number
  quality?: number
  crop?: "maintain_ratio" | "at_max"
}

/**
 * Delivery URL. `f-auto` serves AVIF/WebP when the browser supports it.
 * Endpoint is passed in so this stays usable from the next/image loader (no env import there).
 */
export function imagekitUrl(endpoint: string, path: string, t: Transform = {}): string {
  const parts = ["f-auto", `q-${t.quality ?? 75}`]
  if (t.width) parts.push(`w-${t.width}`)
  if (t.height) parts.push(`h-${t.height}`)
  if (t.crop) parts.push(`c-${t.crop}`)
  return `${endpoint.replace(/\/$/, "")}${path}?tr=${parts.join(",")}`
}
