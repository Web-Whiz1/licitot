"use client"

import { CircleAlert } from "@/components/icons"
import { useTranslations } from "next-intl"
import type { MessageKey } from "@/i18n/keys"
import { cn } from "@/lib/utils"

/** Renders a translated validation message. `message` is a dictionary key from Zod/actions. */
export function FieldError({
  id,
  message,
  className,
}: {
  id: string
  message?: string
  className?: string
}) {
  const t = useTranslations()
  if (!message) return null
  return (
    <p id={id} role="alert" className={cn("text-sm font-medium text-destructive", className)}>
      {t(message as MessageKey)}
    </p>
  )
}

/** Form-level error banner. */
export function FormAlert({ message }: { message?: MessageKey }) {
  const t = useTranslations()
  if (!message) return null
  return (
    <div
      role="alert"
      className="flex items-start gap-2 rounded-lg bg-destructive-soft p-3 text-sm font-medium text-destructive"
    >
      <CircleAlert aria-hidden className="mt-0.5 size-4 shrink-0" />
      {t(message)}
    </div>
  )
}
