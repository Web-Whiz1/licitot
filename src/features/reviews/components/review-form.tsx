"use client"

import { zodResolver } from "@hookform/resolvers/zod"
import { Star } from "@/components/icons"
import { useRouter } from "next/navigation"
import { useTranslations } from "next-intl"
import { useTransition } from "react"
import { useForm, useWatch } from "react-hook-form"
import { toast } from "sonner"
import type { z } from "zod"
import { applyActionResult } from "@/components/forms/apply-action-result"
import { FieldError } from "@/components/forms/field-error"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { cn } from "@/lib/utils"
import { leaveReview } from "../actions"
import { reviewSchema } from "../schemas"

/** Star rating (radio group) + optional comment for a completed order. */
export function ReviewForm({ orderId, role }: { orderId: string; role: "buyer" | "seller" }) {
  const t = useTranslations("reviews")
  const tAll = useTranslations()
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const form = useForm<z.input<typeof reviewSchema>, unknown, z.output<typeof reviewSchema>>({
    resolver: zodResolver(reviewSchema),
    defaultValues: { orderId, rating: 0, comment: "" },
  })
  const rating = Number(useWatch({ control: form.control, name: "rating" }) ?? 0)
  const { errors } = form.formState

  return (
    <form
      noValidate
      className="space-y-3"
      onSubmit={form.handleSubmit((values) =>
        startTransition(async () => {
          const result = await leaveReview(values)
          const error = applyActionResult(form, result)
          if (error) toast.error(tAll(error))
          if (result.ok) {
            toast.success(t("thanks"))
            router.refresh()
          }
        }),
      )}
    >
      <div>
        <h3 className="font-semibold">{t("title")}</h3>
        <p className="text-sm text-muted-foreground">
          {role === "buyer" ? t("hintBuyer") : t("hintSeller")}
        </p>
      </div>
      <fieldset>
        <legend className="mb-1 text-sm font-medium">{t("ratingLabel")}</legend>
        <div className="flex gap-1">
          {[1, 2, 3, 4, 5].map((n) => (
            <label
              key={n}
              className="cursor-pointer rounded-md p-0.5 has-focus-visible:ring-3 has-focus-visible:ring-ring/50"
            >
              <input
                type="radio"
                value={n}
                className="sr-only"
                aria-label={t("star", { n })}
                {...form.register("rating")}
              />
              <Star
                aria-hidden
                weight={n <= rating ? "fill" : "light"}
                className={cn(
                  "size-8 transition-colors",
                  n <= rating ? "text-warning" : "text-muted-foreground/40",
                )}
              />
            </label>
          ))}
        </div>
        <FieldError id="review-rating-error" message={errors.rating?.message} />
      </fieldset>
      <div className="space-y-1.5">
        <Label htmlFor="review-comment">{t("commentLabel")}</Label>
        <Textarea
          id="review-comment"
          rows={3}
          placeholder={t("commentPlaceholder")}
          {...form.register("comment")}
        />
        <FieldError id="review-comment-error" message={errors.comment?.message} />
      </div>
      <Button type="submit" disabled={pending}>
        {t("submit")}
      </Button>
    </form>
  )
}
