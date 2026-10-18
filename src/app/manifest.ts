import type { MetadataRoute } from "next"
import messages from "../../messages/ro.json"
import { colorTokens } from "@/lib/brand/tokens"

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: `${messages.meta.siteName} - ${messages.meta.tagline}`,
    short_name: messages.meta.siteName,
    description: messages.meta.ogSubtitle,
    lang: "ro",
    start_url: "/",
    scope: "/",
    display: "standalone",
    background_color: colorTokens.light.background,
    theme_color: colorTokens.light.background,
    categories: ["shopping"],
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      {
        src: "/icons/icon-maskable-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
  }
}
