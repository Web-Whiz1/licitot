"use client"

import { zodResolver } from "@hookform/resolvers/zod"
import { KeyRound, Send, Truck, TriangleAlert } from "lucide-react"
import { useRouter } from "next/navigation"
import { useTranslations } from "next-intl"
import { useState, useTransition } from "react"
import { useForm, type FieldValues, type UseFormReturn } from "react-hook-form"
import { toast } from "sonner"
import type { z } from "zod"
import { applyActionResult } from "@/components/forms/apply-action-result"
import { FieldError } from "@/components/forms/field-error"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { NativeSelect } from "@/components/ui/native-select"
import { Textarea } from "@/components/ui/textarea"
import type { ActionResult } from "@/lib/action-result"
import { cn } from "@/lib/utils"
import { confirmHandover, markOrderShipped, openDispute, respondDispute } from "../actions"
import {
  CARRIERS,
  DISPUTE_REASONS,
  disputeResponseSchema,
  disputeSchema,
  handoverSchema,
  shipSchema,
} from "../schemas"

/** Runs a form action: field errors inline, form errors and success as toasts, then refresh. */
function useOrderAction() {
  const t = useTranslations()
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const run = <T extends FieldValues, TOut extends FieldValues>(
    form: UseFormReturn<T, unknown, TOut>,
    action: () => Promise<ActionResult>,
  ) =>
    startTransition(async () => {
      const result = await action()
      const error = applyActionResult(form, result)
      if (error) toast.error(t(error))
      if (result.ok) {
        if (result.message) toast.success(t(result.message))
        router.refresh()
      }
    })
  return { pending, run }
}

/** Seller, pickup: type the buyer's 6-digit code at the handover. */
export function HandoverForm({ orderId }: { orderId: string }) {
  const t = useTranslations("orders")
  const { pending, run } = useOrderAction()
  const form = useForm<z.input<typeof handoverSchema>, unknown, z.output<typeof handoverSchema>>({
    resolver: zodResolver(handoverSchema),
    defaultValues: { orderId, code: "" },
  })
  const error = form.formState.errors.code?.message

  return (
    <form
      noValidate
      className="space-y-3"
      onSubmit={form.handleSubmit((values) => run(form, () => confirmHandover(values)))}
    >
      <div className="space-y-1.5">
        <Label htmlFor="handover-code">{t("handoverCodeLabel")}</Label>
        <Input
          id="handover-code"
          inputMode="numeric"
          autoComplete="one-time-code"
          maxLength={6}
          placeholder="000000"
          className="h-12 max-w-48 text-center font-mono text-2xl tracking-[0.3em]"
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? "handover-code-error" : undefined}
          {...form.register("code")}
        />
        <FieldError id="handover-code-error" message={error} />
      </div>
      <Button type="submit" className="w-full" disabled={pending}>
        <KeyRound data-icon="inline-start" />
        {t("handoverSubmit")}
      </Button>
    </form>
  )
}

/** Seller, courier: carrier + AWB number. */
export function ShipForm({ orderId }: { orderId: string }) {
  const t = useTranslations("orders")
  const { pending, run } = useOrderAction()
  const form = useForm<z.input<typeof shipSchema>, unknown, z.output<typeof shipSchema>>({
    resolver: zodResolver(shipSchema),
    defaultValues: { orderId, trackingNumber: "" },
  })
  const { errors } = form.formState

  return (
    <form
      noValidate
      className="space-y-3"
      onSubmit={form.handleSubmit((values) => run(form, () => markOrderShipped(values)))}
    >
      <div className="space-y-1.5">
        <Label htmlFor="ship-carrier">{t("carrier")}</Label>
        <NativeSelect
          id="ship-carrier"
          defaultValue=""
          aria-invalid={errors.carrier ? true : undefined}
          {...form.register("carrier")}
        >
          <option value="" disabled>
            {t("carrierPlaceholder")}
          </option>
          {CARRIERS.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </NativeSelect>
        <FieldError id="ship-carrier-error" message={errors.carrier?.message} />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="ship-awb">{t("awb")}</Label>
        <Input
          id="ship-awb"
          autoComplete="off"
          className="font-mono uppercase"
          aria-invalid={errors.trackingNumber ? true : undefined}
          {...form.register("trackingNumber")}
        />
        <FieldError id="ship-awb-error" message={errors.trackingNumber?.message} />
      </div>
      <Button type="submit" className="w-full" disabled={pending}>
        <Truck data-icon="inline-start" />
        {t("shipSubmit")}
      </Button>
    </form>
  )
}

/** Buyer: "I have a problem" → reason + details; freezes the money until an admin decides. */
export function DisputeForm({ orderId }: { orderId: string }) {
  const t = useTranslations("orders")
  const [open, setOpen] = useState(false)
  const { pending, run } = useOrderAction()
  const form = useForm<z.input<typeof disputeSchema>, unknown, z.output<typeof disputeSchema>>({
    resolver: zodResolver(disputeSchema),
    defaultValues: { orderId, details: "" },
  })
  const { errors } = form.formState

  if (!open) {
    return (
      <Button variant="outline" className="w-full" onClick={() => setOpen(true)}>
        <TriangleAlert data-icon="inline-start" />
        {t("problem")}
      </Button>
    )
  }

  return (
    <form
      noValidate
      className="space-y-4 rounded-lg border border-warning/40 bg-warning-soft/40 p-4"
      onSubmit={form.handleSubmit((values) => run(form, () => openDispute(values)))}
    >
      <div className="space-y-1">
        <h3 className="font-semibold">{t("disputeTitle")}</h3>
        <p className="text-sm text-muted-foreground">{t("disputeHint")}</p>
      </div>
      <fieldset className="space-y-2">
        <legend className="mb-1 text-sm font-medium">{t("reasonLabel")}</legend>
        {DISPUTE_REASONS.map((r) => (
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
        <FieldError id="dispute-reason-error" message={errors.reason?.message} />
      </fieldset>
      <div className="space-y-1.5">
        <Label htmlFor="dispute-details">{t("detailsLabel")}</Label>
        <Textarea
          id="dispute-details"
          rows={4}
          placeholder={t("detailsPlaceholder")}
          aria-invalid={errors.details ? true : undefined}
          {...form.register("details")}
        />
        <FieldError id="dispute-details-error" message={errors.details?.message} />
      </div>
      <div className="flex flex-wrap gap-2">
        <Button type="submit" disabled={pending}>
          <Send data-icon="inline-start" />
          {t("disputeSubmit")}
        </Button>
        <Button type="button" variant="ghost" disabled={pending} onClick={() => setOpen(false)}>
          {t("back")}
        </Button>
      </div>
    </form>
  )
}

/** Seller: answer the buyer's dispute. */
export function DisputeResponseForm({
  orderId,
  initial,
}: {
  orderId: string
  initial: string | null
}) {
  const t = useTranslations("orders")
  const { pending, run } = useOrderAction()
  const form = useForm<
    z.input<typeof disputeResponseSchema>,
    unknown,
    z.output<typeof disputeResponseSchema>
  >({
    resolver: zodResolver(disputeResponseSchema),
    defaultValues: { orderId, response: initial ?? "" },
  })
  const error = form.formState.errors.response?.message

  return (
    <form
      noValidate
      className="space-y-2"
      onSubmit={form.handleSubmit((values) => run(form, () => respondDispute(values)))}
    >
      <Label htmlFor="dispute-response">{t("sellerResponseLabel")}</Label>
      <Textarea
        id="dispute-response"
        rows={4}
        aria-invalid={error ? true : undefined}
        className={cn(error && "border-destructive")}
        {...form.register("response")}
      />
      <FieldError id="dispute-response-error" message={error} />
      <Button type="submit" size="sm" disabled={pending}>
        {t("respondSubmit")}
      </Button>
    </form>
  )
}
