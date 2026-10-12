import { describe, expect, it } from "vitest"
import { browseHref, parseBrowseParams } from "./params"

describe("parseBrowseParams", () => {
  it("returns defaults for an empty URL", () => {
    expect(parseBrowseParams({})).toEqual({
      q: "",
      category: null,
      minPrice: null,
      maxPrice: null,
      county: null,
      conditions: [],
      endingSoon: false,
      sort: "curand",
      page: 1,
    })
  })

  it("parses every filter", () => {
    expect(
      parseBrowseParams({
        q: "  bicicletă ",
        categorie: "biciclete",
        pret_min: "100",
        pret_max: "500",
        judet: "CJ",
        stare: ["nou", "ca_nou"],
        curand: "1",
        ordine: "pret_asc",
        pagina: "3",
      }),
    ).toEqual({
      q: "bicicletă",
      category: "biciclete",
      minPrice: 100,
      maxPrice: 500,
      county: "CJ",
      conditions: ["nou", "ca_nou"],
      endingSoon: true,
      sort: "pret_asc",
      page: 3,
    })
  })

  it("drops invalid values instead of failing", () => {
    const f = parseBrowseParams({
      categorie: "../etc",
      pret_min: "-5",
      judet: "XX",
      stare: "nou,stricat",
      ordine: "random",
      pagina: "0",
    })
    expect(f).toMatchObject({
      category: null,
      minPrice: null,
      county: null,
      conditions: ["nou"],
      sort: "curand",
      page: 1,
    })
  })

  it("swaps an inverted price range", () => {
    expect(parseBrowseParams({ pret_min: "900", pret_max: "100" })).toMatchObject({
      minPrice: 100,
      maxPrice: 900,
    })
  })
})

describe("browseHref", () => {
  it("omits defaults and round-trips through the parser", () => {
    const f = parseBrowseParams({
      q: "ceas",
      stare: ["nou"],
      ordine: "noi",
      pagina: "2",
      judet: "B",
    })
    const href = browseHref("/cauta", f)
    expect(href).toBe("/cauta?q=ceas&judet=B&stare=nou&ordine=noi&pagina=2")
    const params = Object.fromEntries(new URL(href, "http://x").searchParams)
    expect(parseBrowseParams({ ...params, stare: "nou" })).toEqual(f)
  })

  it("leaves the category out on category pages", () => {
    expect(
      browseHref(
        "/categorie/biciclete",
        { category: "biciclete", sort: "curand" },
        { includeCategory: false },
      ),
    ).toBe("/categorie/biciclete")
  })
})
