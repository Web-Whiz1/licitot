"use client"

import { upload } from "@imagekit/next"
import imageCompression from "browser-image-compression"
import { publicEnv } from "@/lib/env"
import type { UploadPurpose } from "@/lib/imagekit"

export type UploadedImage = {
  fileId: string
  path: string
  width: number | null
  height: number | null
  blurDataUrl: string | null
}

export class UploadError extends Error {
  constructor(public readonly code: "rate_limited" | "unauthorized" | "failed") {
    super(code)
  }
}

const PRESETS: Record<UploadPurpose, { maxSide: number; maxMB: number }> = {
  auction: { maxSide: 2000, maxMB: 1.5 },
  avatar: { maxSide: 512, maxMB: 0.3 },
}

function readAsDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(String(reader.result))
    reader.onerror = () => reject(reader.error)
    reader.readAsDataURL(blob)
  })
}

/** ~20px WebP thumbnail as a data URL, used as next/image blurDataURL (a few hundred bytes). */
async function makeBlurDataUrl(file: File): Promise<string | null> {
  try {
    const tiny = await imageCompression(file, {
      maxWidthOrHeight: 20,
      fileType: "image/webp",
      initialQuality: 0.5,
      useWebWorker: false,
    })
    const url = await readAsDataUrl(tiny)
    return url.length <= 3000 ? url : null
  } catch {
    return null
  }
}

/**
 * Client-side pipeline: compress (resize + WebP) → blur preview → signed upload to ImageKit.
 * The server later verifies the file via the ImageKit API before saving its path.
 */
export async function uploadImage(
  file: File,
  purpose: UploadPurpose,
  { onProgress, signal }: { onProgress?: (pct: number) => void; signal?: AbortSignal } = {},
): Promise<UploadedImage> {
  const preset = PRESETS[purpose]
  const compressed = await imageCompression(file, {
    maxWidthOrHeight: preset.maxSide,
    maxSizeMB: preset.maxMB,
    fileType: "image/webp",
    initialQuality: 0.85,
    useWebWorker: true,
    signal,
  })

  const [bitmap, blurDataUrl] = await Promise.all([
    createImageBitmap(compressed).catch(() => null),
    makeBlurDataUrl(compressed),
  ])

  const authRes = await fetch("/api/imagekit/auth", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ purpose }),
    signal,
  })
  if (authRes.status === 429) throw new UploadError("rate_limited")
  if (authRes.status === 401) throw new UploadError("unauthorized")
  if (!authRes.ok) throw new UploadError("failed")
  const auth = (await authRes.json()) as {
    token: string
    expire: number
    signature: string
    folder: string
  }

  const result = await upload({
    file: compressed,
    fileName: `${crypto.randomUUID()}.webp`,
    folder: auth.folder,
    useUniqueFileName: false,
    token: auth.token,
    expire: auth.expire,
    signature: auth.signature,
    publicKey: publicEnv.NEXT_PUBLIC_IMAGEKIT_PUBLIC_KEY,
    onProgress: (e) => {
      if (e.lengthComputable) onProgress?.(Math.round((e.loaded / e.total) * 100))
    },
    abortSignal: signal,
  })

  if (!result.fileId || !result.filePath) throw new UploadError("failed")
  return {
    fileId: result.fileId,
    path: result.filePath,
    width: result.width ?? bitmap?.width ?? null,
    height: result.height ?? bitmap?.height ?? null,
    blurDataUrl,
  }
}
