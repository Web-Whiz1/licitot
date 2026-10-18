"use client"

import { zodResolver } from "@hookform/resolvers/zod"
import { Flag } from "lucide-react"
import { useTranslations } from "next-intl"
import { useState, useTransition } from "react"
import { useForm } from "react-hook-form"
import { toast } from "sonner"
import type { z } from "zod"
import { applyActionResult } from "@/components/forms/apply-action-result"
import { FieldError } from "@/components/forms/field-error"
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { reportContent } from "../actions"
import { REPORT_REASONS, reportSchema } from "../schemas"

/** "Report this listing / profile" link + dialog. */
export function ReportButton({ auctionId, userId }: { auctionId?: string; userId?: string }) {
  const t = useTranslations("reports")
  const tAll = useTranslations()
  const [open, setOpen] = useState(false)
  const [pending, startTransition] = useTransition()
  const form = useForm<z.input<typeof reportSchema>, unknown, z.output<typeof reportSchema>>({
    resolver: zodResolver(reportSchema),
    defaultValues: { auctionId, userId, details: "" },
  })
  const { errors } = form.formState

  return (
    <AlertDialog open={open} onOpenChange={(o) => !pending && setOpen(o)}>
      <AlertDialogTrigger asChild>
        <Button variant="ghost" size="sm" className="text-muted-foreground">
          <Flag data-icon="inline-start" />
          {auctionId ? t("auction") : t("user")}
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <form
          noValidate
          className="space-y-4"
          onSubmit={form.handleSubmit((values) =>
            startTransition(async () => {
              const result = await reportContent(values)
              const error = applyActionResult(form, result)
              if (error) toast.error(tAll(error))
              if (result.ok) {
                toast.success(t("sent"))
                setOpen(false)
                form.reset({ auctionId, userId, details: "" })
              }
            }),
          )}
        >
          <AlertDialogHeader>
            <AlertDialogTitle>{auctionId ? t("auction") : t("user")}</AlertDialogTitle>
            <AlertDialogDescription>{t("hint")}</AlertDialogDescription>
          </AlertDialogHeader>
          <fieldset className="space-y-2">
            <legend className="mb-1 text-sm font-medium">{t("reasonLabel")}</legend>
            {REPORT_REASONS.map((r) => (
              <label key={r} className="flex cursor-pointer items-center gap-2 text-sm">
                <input
                  type="radio"
                  value={r}
                  className="size-4 accent-primary"
                  {...form.register("reason")}
                />
                {t(`reasons.${r}`)}
              </label>
            ))}
            <FieldError id="report-reason-error" message={errors.reason?.message} />
          </fieldset>
          <div className="space-y-1.5">
            <Label htmlFor="report-details">{t("detailsLabel")}</Label>
            <Textarea id="report-details" rows={3} {...form.register("details")} />
            <FieldError id="report-details-error" message={errors.details?.message} />
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel type="button" disabled={pending}>
              {t("cancel")}
            </AlertDialogCancel>
            <Button type="submit" disabled={pending}>
              {t("submit")}
            </Button>
          </AlertDialogFooter>
        </form>
      </AlertDialogContent>
    </AlertDialog>
  )
}
