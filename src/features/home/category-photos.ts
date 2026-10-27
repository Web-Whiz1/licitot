import type { StaticImageData } from "next/image"
import autoMoto from "@/assets/categories/auto-moto.webp"
import carti from "@/assets/categories/carti.webp"
import casaGradina from "@/assets/categories/casa-gradina.webp"
import colectii from "@/assets/categories/colectii.webp"
import copii from "@/assets/categories/copii.webp"
import electronice from "@/assets/categories/electronice.webp"
import moda from "@/assets/categories/moda.webp"
import sport from "@/assets/categories/sport.webp"

/** Photo per top-level category slug (CC0, see src/assets/categories/README.md). */
export const CATEGORY_PHOTOS: Record<string, StaticImageData> = {
  electronice,
  "auto-moto": autoMoto,
  "casa-gradina": casaGradina,
  moda,
  sport,
  colectii,
  copii,
  carti,
}
