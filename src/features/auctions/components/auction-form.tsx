"use client"

import { zodResolver } from "@hookform/resolvers/zod"
import { Info, Send } from "lucide-react"
import { useRouter } from "next/navigation"
import { useTranslations } from "next-intl"
import { useCallback, useState, useSyncExternalStore, useTransition } from "react"
import { useForm, useWatch, type FieldPath } from "react-hook-form"
import { toast } from "sonner"
import { applyActionResult } from "@/components/forms/apply-action-result"
import { FieldError, FormAlert } from "@/components/forms/field-error"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { NativeSelect } from "@/components/ui/native-select"
import { Textarea } from "@/components/ui/textarea"
import type { MessageKey } from "@/i18n/keys"
import { COUNTIES } from "@/lib/counties"
import { formatDateTime } from "@/lib/dates"
import { formatRON, parseRONToBani } from "@/lib/money"
import { ImageUploader } from "@/features/media/image-uploader"
import type { UploadedImage } from "@/features/media/upload-image"
import { publishAuction, saveDraft } from "../actions"
import { DURATIONS, ITEM_CONDITIONS, MIN_PRICE } from "../constants"
import { estimatePayout, suggestIncrement } from "../pricing"
import type { CategoryGroup } from "../queries"
import { auctionFormSchema, type AuctionFormInput, type AuctionFormOutput } from "../schemas"

type Props = {
  auctionId: string | null
  categories: CategoryGroup[]
  defaults: AuctionFormInput
}

// Client clock for the "ends on" estimate. null on the server → no hydration mismatch.
function subscribeMinute(cb: () => void) {
  const id = setInterval(cb, 60_000)
  return () => clearInterval(id)
}
function useNow(): number | null {
  return useSyncExternalStore(
    subscribeMinute,
    () => Math.floor(Date.now() / 60_000) * 60_000,
    () => null,
  )
}

export function AuctionForm({ auctionId: initialId, categories, defaults }: Props) {
  const t = useTranslations("sell")
  const tAll = useTranslations()
  const router = useRouter()
  const now = useNow()
  const [auctionId, setAuctionId] = useState(initialId)
  const [pending, startTransition] = useTransition()
  const [uploading, setUploading] = useState(false)
  const [formError, setFormError] = useState<MessageKey>()

  const form = useForm<AuctionFormInput, unknown, AuctionFormOutput>({
    resolver: zodResolver(auctionFormSchema),
    defaultValues: defaults,
    mode: "onTouched",
  })
  const { errors } = form.formState
  const [
    startingPrice,
    minIncrement,
    buyNowPrice,
    durationDays,
    shipPickup,
    shipCourier,
    description,
  ] = useWatch({
    control: form.control,
    name: [
      "startingPrice",
      "minIncrement",
      "buyNowPrice",
      "durationDays",
      "shipPickup",
      "shipCourier",
      "description",
    ],
  })

  const startBani = parseRONToBani(startingPrice)
  const buyNowBani = buyNowPrice ? parseRONToBani(buyNowPrice) : null
  const suggested =
    startBani !== null && startBani >= MIN_PRICE ? suggestIncrement(startBani) : null
  const suggestedText = suggested !== null ? formatRON(suggested, { compact: true }) : null

  const onImagesChange = useCallback(
    (images: UploadedImage[]) =>
      form.setValue("images", images, {
        shouldDirty: true,
        shouldValidate: form.formState.isSubmitted,
      }),
    [form],
  )

  const submit = (intent: "draft" | "publish") =>
    form.handleSubmit(() => {
      setFormError(undefined)
      if (uploading) {
        setFormError("validation.imagesPending")
        return
      }
      const values = form.getValues()
      if (intent === "publish" && values.images.length === 0) {
        form.setError("images", { message: "validation.imagesRequired" })
        return
      }
      startTransition(async () => {
        const action = intent === "draft" ? saveDraft : publishAuction
        const result = await action(auctionId, values)
        // A draft may exist even if publishing failed; keep editing that one.
        const savedId = result.data?.id
        if (savedId && savedId !== auctionId) {
          setAuctionId(savedId)
          router.replace(`/vinde/${savedId}`, { scroll: false })
        }
        setFormError(applyActionResult(form, result))
        if (result.ok && result.message) {
          toast.success(tAll(result.message))
          form.reset(values)
        }
      })
    })

  const aria = (name: FieldPath<AuctionFormInput>, hint?: string) => {
    const hasError = Boolean(form.getFieldState(name).error)
    return {
      "aria-invalid": hasError,
      "aria-describedby":
        [hint, hasError ? `${name}-error` : null].filter(Boolean).join(" ") || undefined,
    }
  }

  return (
    <form
      noValidate
      onSubmit={submit("publish")}
      className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_20rem] lg:items-start"
    >
      <div className="space-y-10">
        <FormAlert message={formError} />

        {/* Photos */}
        <Section title={t("photos")} hint={t("photosHint")} hintId="images-hint">
          <ImageUploader
            initial={defaults.images}
            onChange={onImagesChange}
            onPendingChange={setUploading}
            invalid={!!errors.images}
            describedBy={["images-hint", errors.images ? "images-error" : null]
              .filter(Boolean)
              .join(" ")}
          />
          <FieldError id="images-error" message={errors.images?.message} />
        </Section>

        {/* Details */}
        <Section title={t("details")}>
          <div className="space-y-1.5">
            <Label htmlFor="title">{t("titleLabel")}</Label>
            <Input
              id="title"
              maxLength={80}
              placeholder={t("titlePlaceholder")}
              {...aria("title")}
              {...form.register("title")}
            />
            <FieldError id="title-error" message={errors.title?.message} />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="categoryId">{t("category")}</Label>
              <NativeSelect
                id="categoryId"
                {...aria("categoryId")}
                {...form.register("categoryId")}
              >
                <option value="">{t("categoryPlaceholder")}</option>
                {categories.map((group) => (
                  <optgroup key={group.id} label={group.name}>
                    {group.children.map((c) => (
                      <option key={c.id} value={String(c.id)}>
                        {c.name}
                      </option>
                    ))}
                  </optgroup>
                ))}
              </NativeSelect>
              <FieldError id="categoryId-error" message={errors.categoryId?.message} />
            </div>
          </div>

          <fieldset className="space-y-2" {...aria("condition")}>
            <legend className="mb-2 text-sm font-medium">{t("condition")}</legend>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              {ITEM_CONDITIONS.map((c) => (
                <label
                  key={c}
                  className="flex cursor-pointer flex-col gap-0.5 rounded-lg border p-3 text-sm transition-colors has-checked:border-primary has-checked:bg-sky-soft has-focus-visible:outline-2 has-focus-visible:outline-ring"
                >
                  <input
                    type="radio"
                    value={c}
                    className="sr-only"
                    {...form.register("condition")}
                  />
                  <span className="font-semibold">{t(`conditions.${c}`)}</span>
                  <span className="text-xs text-muted-foreground">{t(`conditionHints.${c}`)}</span>
                </label>
              ))}
            </div>
            <FieldError id="condition-error" message={errors.condition?.message} />
          </fieldset>

          <div className="space-y-1.5">
            <div className="flex items-baseline justify-between">
              <Label htmlFor="description">{t("description")}</Label>
              <span className="text-xs text-muted-foreground" aria-live="polite">
                {t("charCount", { count: description.length, max: 5000 })}
              </span>
            </div>
            <Textarea
              id="description"
              rows={8}
              maxLength={5000}
              placeholder={t("descriptionPlaceholder")}
              {...aria("description")}
              {...form.register("description")}
            />
            <FieldError id="description-error" message={errors.description?.message} />
          </div>
        </Section>

        {/* Pricing */}
        <Section title={t("pricing")}>
          <div className="grid gap-4 sm:grid-cols-2">
            <MoneyField
              id="startingPrice"
              label={t("startingPrice")}
              currency={t("currency")}
              error={errors.startingPrice?.message}
              inputProps={{ ...aria("startingPrice"), ...form.register("startingPrice") }}
            />
            <MoneyField
              id="minIncrement"
              label={t("minIncrement")}
              currency={t("currency")}
              hint={t("minIncrementHint")}
              error={errors.minIncrement?.message}
              inputProps={{
                ...aria("minIncrement", "minIncrement-hint"),
                ...form.register("minIncrement"),
              }}
              after={
                suggested !== null && parseRONToBani(minIncrement) !== suggested ? (
                  <button
                    type="button"
                    className="text-xs font-semibold text-primary underline-offset-4 hover:underline"
                    onClick={() =>
                      form.setValue("minIncrement", String(suggested / 100), {
                        shouldDirty: true,
                        shouldValidate: true,
                      })
                    }
                  >
                    {t("useSuggested", { amount: suggestedText ?? "" })}
                  </button>
                ) : null
              }
            />
            <MoneyField
              id="reservePrice"
              label={t("reservePrice")}
              currency={t("currency")}
              hint={t("reserveHint")}
              error={errors.reservePrice?.message}
              inputProps={{
                ...aria("reservePrice", "reservePrice-hint"),
                ...form.register("reservePrice"),
              }}
            />
            <MoneyField
              id="buyNowPrice"
              label={t("buyNowPrice")}
              currency={t("currency")}
              hint={t("buyNowHint")}
              error={errors.buyNowPrice?.message}
              inputProps={{
                ...aria("buyNowPrice", "buyNowPrice-hint"),
                ...form.register("buyNowPrice"),
              }}
            />
          </div>
        </Section>

        {/* Duration */}
        <Section title={t("duration")}>
          <fieldset {...aria("durationDays")}>
            <legend className="sr-only">{t("duration")}</legend>
            <div className="flex flex-wrap gap-2">
              {DURATIONS.map((d) => (
                <label
                  key={d}
                  className="cursor-pointer rounded-full border px-4 py-2 text-sm font-medium transition-colors has-checked:border-primary has-checked:bg-primary has-checked:text-primary-foreground has-focus-visible:outline-2 has-focus-visible:outline-ring"
                >
                  <input
                    type="radio"
                    value={String(d)}
                    className="sr-only"
                    {...form.register("durationDays")}
                  />
                  {t("durationDays", { days: d })}
                </label>
              ))}
            </div>
            <FieldError id="durationDays-error" message={errors.durationDays?.message} />
          </fieldset>
        </Section>

        {/* Shipping & location */}
        <Section title={t("shipping")}>
          <div className="space-y-3">
            <CheckboxRow
              id="shipPickup"
              label={t("shipPickup")}
              checked={shipPickup}
              onChange={(v) =>
                form.setValue("shipPickup", v, { shouldDirty: true, shouldValidate: true })
              }
            />
            <CheckboxRow
              id="shipCourier"
              label={t("shipCourier")}
              checked={shipCourier}
              onChange={(v) =>
                form.setValue("shipCourier", v, { shouldDirty: true, shouldValidate: true })
              }
            />
            <FieldError id="shipPickup-error" message={errors.shipPickup?.message} />
            {shipCourier ? (
              <div className="max-w-xs pl-8">
                <MoneyField
                  id="courierCost"
                  label={t("courierCost")}
                  currency={t("currency")}
                  hint={t("courierHint")}
                  error={errors.courierCost?.message}
                  inputProps={{
                    ...aria("courierCost", "courierCost-hint"),
                    ...form.register("courierCost"),
                  }}
                />
              </div>
            ) : null}
          </div>

          <h3 className="pt-4 text-base font-semibold">{t("location")}</h3>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="countyCode">{t("county")}</Label>
              <NativeSelect
                id="countyCode"
                {...aria("countyCode")}
                {...form.register("countyCode")}
              >
                <option value="">{tAll("settings.countyPlaceholder")}</option>
                {COUNTIES.map((c) => (
                  <option key={c.code} value={c.code}>
                    {c.name}
                  </option>
                ))}
              </NativeSelect>
              <FieldError id="countyCode-error" message={errors.countyCode?.message} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="city">{t("city")}</Label>
              <Input
                id="city"
                autoComplete="address-level2"
                {...aria("city")}
                {...form.register("city")}
              />
              <FieldError id="city-error" message={errors.city?.message} />
            </div>
          </div>
        </Section>
      </div>

      {/* Summary + actions (sticky on desktop) */}
      <aside className="space-y-4 rounded-2xl border bg-card p-5 shadow-card lg:sticky lg:top-24">
        <h2 className="text-lg font-semibold">{t("summary")}</h2>
        <div className="rounded-lg bg-sky-soft p-3 text-sm text-secondary-foreground">
          {startBani !== null && startBani >= MIN_PRICE ? (
            <>
              <p className="font-semibold">
                {t("feeNote", { payout: formatRON(estimatePayout(startBani), { compact: true }) })}
              </p>
              <p className="text-xs">({t("feeNoteAt")})</p>
              {buyNowBani !== null && buyNowBani > startBani ? (
                <p className="mt-1 text-xs">
                  {t("feeBuyNow", {
                    payout: formatRON(estimatePayout(buyNowBani), { compact: true }),
                  })}
                </p>
              ) : null}
            </>
          ) : (
            <p>{t("feeExplain")}</p>
          )}
        </div>
        {startBani !== null && startBani >= MIN_PRICE ? (
          <p className="flex gap-2 text-xs text-muted-foreground">
            <Info aria-hidden className="mt-0.5 size-3.5 shrink-0" />
            {t("feeExplain")}
          </p>
        ) : null}
        {now !== null && DURATIONS.some((d) => String(d) === durationDays) ? (
          <p className="text-sm">
            {t("endsAt", { date: formatDateTime(now + Number(durationDays) * 86_400_000) })}
          </p>
        ) : null}
        <div className="flex flex-col gap-2">
          <Button type="submit" size="lg" disabled={pending}>
            <Send data-icon="inline-start" />
            {t("publish")}
          </Button>
          <Button type="button" variant="secondary" disabled={pending} onClick={submit("draft")}>
            {t("saveDraft")}
          </Button>
        </div>
      </aside>
    </form>
  )
}

function Section({
  title,
  hint,
  hintId,
  children,
}: {
  title: string
  hint?: string
  hintId?: string
  children: React.ReactNode
}) {
  return (
    <section className="space-y-4">
      <div>
        <h2 className="text-xl font-bold tracking-tight">{title}</h2>
        {hint ? (
          <p id={hintId} className="mt-1 text-sm text-muted-foreground">
            {hint}
          </p>
        ) : null}
      </div>
      {children}
    </section>
  )
}

function MoneyField({
  id,
  label,
  currency,
  hint,
  error,
  inputProps,
  after,
}: {
  id: string
  label: string
  currency: string
  hint?: string
  error?: string
  inputProps: React.ComponentProps<"input">
  after?: React.ReactNode
}) {
  return (
    <div className="space-y-1.5">
      <Label htmlFor={id}>{label}</Label>
      <div className="relative">
        <Input id={id} inputMode="decimal" autoComplete="off" className="pr-14" {...inputProps} />
        <span className="pointer-events-none absolute top-1/2 right-3 -translate-y-1/2 text-sm text-muted-foreground">
          {currency}
        </span>
      </div>
      {hint ? (
        <p id={`${id}-hint`} className="text-xs text-muted-foreground">
          {hint}
        </p>
      ) : null}
      {after}
      <FieldError id={`${id}-error`} message={error} />
    </div>
  )
}

function CheckboxRow({
  id,
  label,
  checked,
  onChange,
}: {
  id: string
  label: string
  checked: boolean
  onChange: (v: boolean) => void
}) {
  return (
    <div className="flex items-center gap-3">
      <Checkbox id={id} checked={checked} onCheckedChange={(v) => onChange(v === true)} />
      <Label htmlFor={id} className="font-normal">
        {label}
      </Label>
    </div>
  )
}
