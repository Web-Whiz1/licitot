"use client"

import type { ImageLoaderProps } from "next/image"
import { imagekitUrl } from "./imagekit"

// Global next/image loader (next.config.ts → images.loaderFile). ImageKit resizes and picks
// the best format, so Next.js does no image optimization itself.
const ENDPOINT = process.env.NEXT_PUBLIC_IMAGEKIT_URL_ENDPOINT ?? ""

export default function imagekitLoader({ src, width, quality }: ImageLoaderProps): string {
  // Local static assets (e.g. /brand/logo.svg) pass through untouched.
  if (!src.startsWith("/licitot/")) return src
  return imagekitUrl(ENDPOINT, src, { width, quality: quality ?? 75 })
}
