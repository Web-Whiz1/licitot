import messages from "../../messages/ro.json"
import { brandOgImage, OG_SIZE } from "@/lib/brand/og"

export const size = OG_SIZE
export const contentType = "image/png"
export const alt = messages.meta.ogAlt

export default async function Image() {
  return brandOgImage({ title: messages.meta.tagline, subtitle: messages.meta.ogSubtitle })
}
