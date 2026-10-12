import Form from "next/form"
import Link from "next/link"
import { useTranslations } from "next-intl"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { NativeSelect } from "@/components/ui/native-select"
import { ITEM_CONDITIONS } from "@/features/auctions/constants"
import type { CategoryGroup } from "@/features/auctions/queries"
import { COUNTIES } from "@/lib/counties"
import type { BrowseFilters } from "../params"

/**
 * Plain GET form: works without JavaScript and keeps every filter in the URL.
 * Rendered twice (desktop sidebar, mobile sheet), so ids are prefixed.
 */
export function FiltersForm({
  idPrefix,
  action,
  filters,
  categories,
  showCategory,
}: {
  idPrefix: string
  action: string
  filters: BrowseFilters
  categories: CategoryGroup[]
  showCategory: boolean
}) {
  const t = useTranslations()
  const id = (name: string) => `${idPrefix}-${name}`

  return (
    <Form action={action} className="space-y-5">
      {filters.q ? <input type="hidden" name="q" value={filters.q} /> : null}
      {filters.sort !== "curand" ? (
        <input type="hidden" name="ordine" value={filters.sort} />
      ) : null}

      {showCategory ? (
        <div className="space-y-1.5">
          <Label htmlFor={id("categorie")}>{t("browse.category")}</Label>
          <NativeSelect id={id("categorie")} name="categorie" defaultValue={filters.category ?? ""}>
            <option value="">{t("browse.allCategories")}</option>
            {categories.map((g) => (
              <optgroup key={g.slug} label={g.name}>
                <option value={g.slug}>
                  {g.name} — {t("browse.allCategories").toLowerCase()}
                </option>
                {g.children.map((c) => (
                  <option key={c.slug} value={c.slug}>
                    {c.name}
                  </option>
                ))}
              </optgroup>
            ))}
          </NativeSelect>
        </div>
      ) : null}

      <fieldset className="space-y-1.5">
        <legend className="mb-1.5 text-sm font-medium">{t("browse.price")}</legend>
        <div className="grid grid-cols-2 gap-2">
          <div>
            <Label htmlFor={id("min")} className="sr-only">
              {t("browse.priceMin")}
            </Label>
            <Input
              id={id("min")}
              name="pret_min"
              inputMode="numeric"
              placeholder={t("browse.priceMin")}
              defaultValue={filters.minPrice ?? ""}
            />
          </div>
          <div>
            <Label htmlFor={id("max")} className="sr-only">
              {t("browse.priceMax")}
            </Label>
            <Input
              id={id("max")}
              name="pret_max"
              inputMode="numeric"
              placeholder={t("browse.priceMax")}
              defaultValue={filters.maxPrice ?? ""}
            />
          </div>
        </div>
      </fieldset>

      <div className="space-y-1.5">
        <Label htmlFor={id("judet")}>{t("browse.county")}</Label>
        <NativeSelect id={id("judet")} name="judet" defaultValue={filters.county ?? ""}>
          <option value="">{t("browse.allCounties")}</option>
          {COUNTIES.map((c) => (
            <option key={c.code} value={c.code}>
              {c.name}
            </option>
          ))}
        </NativeSelect>
      </div>

      <fieldset>
        <legend className="mb-2 text-sm font-medium">{t("browse.condition")}</legend>
        <div className="space-y-2">
          {ITEM_CONDITIONS.map((c) => (
            <label key={c} className="flex items-center gap-2.5 text-sm">
              <input
                type="checkbox"
                name="stare"
                value={c}
                defaultChecked={filters.conditions.includes(c)}
                className="size-4 accent-primary"
              />
              {t(`sell.conditions.${c}`)}
            </label>
          ))}
        </div>
      </fieldset>

      <label className="flex items-center gap-2.5 text-sm font-medium">
        <input
          type="checkbox"
          name="curand"
          value="1"
          defaultChecked={filters.endingSoon}
          className="size-4 accent-primary"
        />
        {t("browse.endingSoon")}
      </label>

      <div className="flex flex-col gap-2">
        <Button type="submit">{t("browse.apply")}</Button>
        <Button asChild variant="ghost" size="sm">
          <Link href={filters.q ? `${action}?q=${encodeURIComponent(filters.q)}` : action}>
            {t("browse.reset")}
          </Link>
        </Button>
      </div>
    </Form>
  )
}
