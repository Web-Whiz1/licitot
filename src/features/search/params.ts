import { z } from "zod"
import { ITEM_CONDITIONS, type ItemCondition } from "@/features/auctions/constants"
import { COUNTY_CODES, type CountyCode } from "@/lib/counties"

// URL search params for browsing (Romanian, human-readable):
//   /cauta?q=bicicleta&categorie=biciclete&pret_min=100&pret_max=500&judet=CJ
//         &stare=nou&stare=ca_nou&curand=1&ordine=pret_asc&pagina=2

export const SORTS = ["curand", "noi", "pret_asc", "pret_desc", "oferte"] as const
export type Sort = (typeof SORTS)[number]

export const PAGE_SIZE = 24

export type BrowseFilters = {
  q: string
  category: string | null
  minPrice: number | null // RON (whole)
  maxPrice: number | null
  county: CountyCode | null
  conditions: ItemCondition[]
  endingSoon: boolean
  sort: Sort
  page: number
}

type RawParams = Record<string, string | string[] | undefined>

const first = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v)
const all = (v: string | string[] | undefined) =>
  (Array.isArray(v) ? v : v ? [v] : []).flatMap((s) => s.split(","))

const ron = z.coerce.number().int().min(0).max(10_000_000)

/** Lenient parser: invalid values are dropped, never thrown — URLs come from anywhere. */
export function parseBrowseParams(raw: RawParams): BrowseFilters {
  const q = (first(raw.q) ?? "").trim().slice(0, 100)
  const category = first(raw.categorie)
  const county = first(raw.judet)
  const sort = first(raw.ordine)
  const min = ron.safeParse(first(raw.pret_min))
  const max = ron.safeParse(first(raw.pret_max))
  const page = z.coerce.number().int().min(1).max(500).safeParse(first(raw.pagina))

  let minPrice = min.success && first(raw.pret_min) ? min.data : null
  let maxPrice = max.success && first(raw.pret_max) ? max.data : null
  if (minPrice !== null && maxPrice !== null && minPrice > maxPrice) {
    ;[minPrice, maxPrice] = [maxPrice, minPrice]
  }

  return {
    q,
    category: category && /^[a-z0-9-]{1,60}$/.test(category) ? category : null,
    minPrice,
    maxPrice,
    county: (COUNTY_CODES as readonly string[]).includes(county ?? "")
      ? (county as CountyCode)
      : null,
    conditions: [...new Set(all(raw.stare))].filter((c): c is ItemCondition =>
      (ITEM_CONDITIONS as readonly string[]).includes(c),
    ),
    endingSoon: first(raw.curand) === "1",
    sort: (SORTS as readonly string[]).includes(sort ?? "") ? (sort as Sort) : "curand",
    page: page.success && first(raw.pagina) ? page.data : 1,
  }
}

/** Builds a URL for `basePath` with the given filters (defaults omitted for clean URLs). */
export function browseHref(
  basePath: string,
  f: Partial<BrowseFilters>,
  { includeCategory = true }: { includeCategory?: boolean } = {},
): string {
  const p = new URLSearchParams()
  if (f.q) p.set("q", f.q)
  if (includeCategory && f.category) p.set("categorie", f.category)
  if (f.minPrice != null) p.set("pret_min", String(f.minPrice))
  if (f.maxPrice != null) p.set("pret_max", String(f.maxPrice))
  if (f.county) p.set("judet", f.county)
  for (const c of f.conditions ?? []) p.append("stare", c)
  if (f.endingSoon) p.set("curand", "1")
  if (f.sort && f.sort !== "curand") p.set("ordine", f.sort)
  if (f.page && f.page > 1) p.set("pagina", String(f.page))
  const qs = p.toString()
  return qs ? `${basePath}?${qs}` : basePath
}
