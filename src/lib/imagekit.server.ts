import "server-only"
import { getUploadAuthParams } from "@imagekit/next/server"
import { publicEnv } from "@/lib/env"
import { serverEnv } from "@/lib/env.server"

const API = "https://api.imagekit.io/v1"

function authHeader() {
  // ImageKit REST: Basic auth with the private key as username and an empty password.
  return `Basic ${Buffer.from(`${serverEnv().IMAGEKIT_PRIVATE_KEY}:`).toString("base64")}`
}

/** Short-lived signed upload parameters (the private key never leaves the server). */
export function createUploadAuth() {
  return getUploadAuthParams({
    privateKey: serverEnv().IMAGEKIT_PRIVATE_KEY,
    publicKey: publicEnv.NEXT_PUBLIC_IMAGEKIT_PUBLIC_KEY,
    expire: Math.floor(Date.now() / 1000) + 10 * 60,
  })
}

export type ImageKitFileDetails = {
  fileId: string
  filePath: string
  fileType: string
  mime?: string
  size: number
  width?: number
  height?: number
}

export async function getFileDetails(fileId: string): Promise<ImageKitFileDetails | null> {
  if (!/^[A-Za-z0-9_-]{1,64}$/.test(fileId)) return null
  const res = await fetch(`${API}/files/${fileId}/details`, {
    headers: { Authorization: authHeader() },
    cache: "no-store",
  })
  if (!res.ok) return null
  return (await res.json()) as ImageKitFileDetails
}

/** Best-effort delete (used for removed draft photos and replaced avatars). */
export async function deleteFile(fileId: string): Promise<void> {
  if (!/^[A-Za-z0-9_-]{1,64}$/.test(fileId)) return
  const res = await fetch(`${API}/files/${fileId}`, {
    method: "DELETE",
    headers: { Authorization: authHeader() },
  })
  if (!res.ok && res.status !== 404) {
    console.error("[imagekit.delete]", fileId, res.status)
  }
}

/** Deletes a file by its path (we store paths, not file IDs, for avatars). */
export async function deleteFileByPath(path: string): Promise<void> {
  const params = new URLSearchParams({
    searchQuery: `filePath = "${path.replace(/"/g, "")}"`,
    limit: "1",
  })
  const res = await fetch(`${API}/files?${params}`, {
    headers: { Authorization: authHeader() },
    cache: "no-store",
  })
  if (!res.ok) return
  const [file] = (await res.json()) as { fileId: string }[]
  if (file) await deleteFile(file.fileId)
}

export const MAX_UPLOAD_BYTES = 5 * 1024 * 1024

/**
 * Confirms an uploaded file really exists in ImageKit, is an image we accept, lives at the
 * claimed path, and returns its true dimensions. Never trust client-reported metadata.
 */
export async function verifyUploadedImage(fileId: string, path: string) {
  const details = await getFileDetails(fileId)
  if (!details) return null
  if (details.filePath !== path) return null
  if (details.fileType !== "image") return null
  if (details.size > MAX_UPLOAD_BYTES) return null
  return { width: details.width ?? null, height: details.height ?? null }
}

/**
 * 64-bit perceptual hash (16 hex chars) computed by ImageKit. Near-identical for the same
 * photo even after re-compression; used to spot photos reused across sellers' listings.
 */
export async function getImagePhash(fileId: string): Promise<string | null> {
  if (!/^[A-Za-z0-9_-]{1,64}$/.test(fileId)) return null
  const res = await fetch(`${API}/files/${fileId}/metadata`, {
    headers: { Authorization: authHeader() },
    cache: "no-store",
  })
  if (!res.ok) return null
  const { pHash } = (await res.json()) as { pHash?: string }
  return pHash && /^[0-9a-f]{1,16}$/i.test(pHash) ? pHash : null
}
