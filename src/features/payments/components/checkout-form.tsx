"use client"

import { CreditCard, MapPin, Truck } from "lucide-react"
import { useTranslations } from "next-intl"
import { useState, useTransition } from "react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { formatRON } from "@/lib/money"
import { cn } from "@/lib/utils"
import { startCheckout } from "../actions"

type Method = "pickup" | "courier"

/** Delivery choice (when the seller offers both) and the button that opens Stripe Checkout. */
export function CheckoutForm({
  orderId,
  itemPrice,
  city,
  options,
  courierCost,
  initial,
}: {
  orderId: string
  itemPrice: number
  city: string
  options: Method[]
  courierCost: number
  initial: Method | null
}) {
  const t = useTranslations()
  const [method, setMethod] = useState<Method | null>(
    initial ?? (options.length === 1 ? options[0]! : null),
  )
  const [pending, startTransition] = useTransition()
  const total = itemPrice + (method === "courier" ? courierCost : 0)
  const price = (bani: number) => formatRON(bani, { compact: true })

  return (
    <form
      className="space-y-4"
      onSubmit={(e) => {
        e.preventDefault()
        if (!method) {
          toast.error(t("orders.errors.delivery_required"))
          return
        }
        startTransition(async () => {
          // On success the action redirects to Stripe; only errors come back.
          const result = await startCheckout({ orderId, delivery: method })
          if (result && !result.ok) toast.error(t(result.error))
        })
      }}
    >
      {options.length > 1 ? (
        <fieldset className="space-y-2">
          <legend className="mb-2 text-sm font-semibold">{t("orders.chooseDelivery")}</legend>
          {options.map((m) => {
            const Icon = m === "pickup" ? MapPin : Truck
            return (
              <label
                key={m}
                className={cn(
                  "flex cursor-pointer items-center gap-3 rounded-xl border p-3 transition-colors",
                  method === m ? "border-primary bg-tint" : "hover:bg-muted",
                )}
              >
                <input
                  type="radio"
                  name="delivery"
                  value={m}
                  checked={method === m}
                  onChange={() => setMethod(m)}
                  className="size-4 accent-primary"
                />
                <Icon aria-hidden className="size-4 text-primary" />
                <span className="flex-1 text-sm">
                  {m === "pickup"
                    ? t("orders.delivery.pickup", { city })
                    : t("orders.courierCost", { price: price(courierCost) })}
                </span>
              </label>
            )
          })}
        </fieldset>
      ) : null}

      <Button type="submit" size="lg" className="w-full" disabled={pending || !method}>
        <CreditCard data-icon="inline-start" />
        {t("orders.pay", { amount: price(total) })}
      </Button>
      <p className="text-center text-xs text-muted-foreground">{t("orders.payHint")}</p>
    </form>
  )
}
