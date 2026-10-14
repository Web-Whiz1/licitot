"use client"

import { useRouter } from "next/navigation"
import { useTranslations } from "next-intl"
import { useState, useTransition } from "react"
import { toast } from "sonner"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { Button } from "@/components/ui/button"
import type { ActionResult } from "@/lib/action-result"

/**
 * Button that runs a Server Action (optionally after a confirmation dialog), toasts the
 * result and refreshes the page. Actions that redirect (e.g. to Stripe) simply navigate away.
 */
export function ActionButton({
  action,
  children,
  confirm,
  ...buttonProps
}: Omit<React.ComponentProps<typeof Button>, "onClick" | "action"> & {
  action: () => Promise<ActionResult<unknown>>
  confirm?: { title: string; text?: string; confirmLabel: string; cancelLabel: string }
}) {
  const t = useTranslations()
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const [open, setOpen] = useState(false)

  const run = () =>
    startTransition(async () => {
      const result = await action()
      setOpen(false)
      if (!result) return
      if (result.ok) {
        if (result.message) toast.success(t(result.message))
        router.refresh()
      } else {
        toast.error(t(result.error))
      }
    })

  const button = (
    <Button
      {...buttonProps}
      disabled={buttonProps.disabled || pending}
      aria-busy={pending || undefined}
      onClick={() => (confirm ? setOpen(true) : run())}
    >
      {children}
    </Button>
  )

  if (!confirm) return button

  return (
    <>
      {button}
      <AlertDialog open={open} onOpenChange={(o) => !pending && setOpen(o)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{confirm.title}</AlertDialogTitle>
            {confirm.text ? <AlertDialogDescription>{confirm.text}</AlertDialogDescription> : null}
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={pending}>{confirm.cancelLabel}</AlertDialogCancel>
            <AlertDialogAction
              disabled={pending}
              onClick={(e) => {
                e.preventDefault()
                run()
              }}
            >
              {confirm.confirmLabel}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
