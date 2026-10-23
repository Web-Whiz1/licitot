"use client"

import {
  ArrowDown,
  Award,
  Check,
  CircleDashed,
  Gavel,
  History,
  Lock,
  ShoppingBag,
  XCircle,
  Zap,
} from "lucide-react"
import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import { useTranslations } from "next-intl"
import { useEffect, useId, useRef, useState, useTransition } from "react"
import { toast } from "sonner"
import { LogoMark } from "@/components/brand/logo"
import { Countdown, useNow } from "@/components/countdown"
import { Price } from "@/components/price"
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
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import type { MessageKey } from "@/i18n/keys"
import { formatDateTime } from "@/lib/dates"
import { formatRON, parseRONToBani } from "@/lib/money"
import { createClient } from "@/lib/supabase/client"
import { cn } from "@/lib/utils"
import { buyNow, cancelAuction, placeBid } from "../actions"
import { patchLiveAuction, useLiveAuction, type LiveAuction } from "../live-store"
import { minNextBid } from "../schemas"

export type { LiveAuction }

/** undefined = still loading the session; null = signed out. */
export type Viewer = { userId: string; myMax: number | null } | null | undefined

type BidRow = {
  id: number
  amount: number
  created_at: string
  bidder: string
  is_auto: boolean
  is_mine: boolean
}

const price = (bani: number) => formatRON(bani, { compact: true })
/** Bani → what a Romanian user would type ("1250" / "1250,5"). */
const toInput = (bani: number) => (bani / 100).toString().replace(".", ",")

export function BidBox({ initial, viewer }: { initial: LiveAuction; viewer: Viewer }) {
  const t = useTranslations("bid")
  const tAll = useTranslations()
  const router = useRouter()
  const pathname = usePathname()
  const inputId = useId()
  const inputRef = useRef<HTMLInputElement>(null)
  const now = useNow()

  const live = useLiveAuction(initial)
  const [myMax, setMyMax] = useState<number | null>(viewer?.myMax ?? null)
  const [history, setHistory] = useState<BidRow[] | null>(null)
  const [showAll, setShowAll] = useState(false)
  const [amount, setAmount] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [confirm, setConfirm] = useState<null | "bid" | "buy" | "cancel">(null)
  const [pending, startTransition] = useTransition()

  // ── Bid history: reload whenever the bid count changes ──
  useEffect(() => {
    if (live.bid_count === 0) return
    let alive = true
    void createClient()
      .rpc("get_auction_bids", { p_auction_id: initial.id, p_limit: 50 })
      .then(({ data }) => {
        if (alive && data) setHistory(data)
      })
    return () => {
      alive = false
    }
  }, [live.bid_count, initial.id])

  const userId = viewer?.userId ?? null
  const isSeller = userId !== null && userId === live.seller_id
  const isLeader = userId !== null && live.high_bidder_id === userId
  const endsAtMs = live.ends_at ? new Date(live.ends_at).getTime() : 0
  const timeUp = now !== null && endsAtMs <= now
  const isOpen = live.status === "active" && !timeUp
  const hasBids = live.bid_count > 0
  const min = minNextBid(live)
  const canBid = isOpen && viewer !== undefined && !isSeller
  const signInHref = `/autentificare?next=${encodeURIComponent(pathname)}`
  const quickPicks = [min, min + live.min_increment * 2, min + live.min_increment * 5]

  function validate(): number | null {
    const bani = parseRONToBani(amount)
    if (bani === null) {
      setError(tAll("validation.price"))
      return null
    }
    if (isLeader) {
      if (myMax !== null && bani <= myMax) {
        setError(tAll("bid.errors.max_not_higher"))
        return null
      }
    } else if (bani < min) {
      setError(t("belowMin", { amount: price(min) }))
      return null
    }
    setError(null)
    return bani
  }

  function submitBid() {
    const bani = parseRONToBani(amount)
    if (bani === null) return
    startTransition(async () => {
      const result = await placeBid({ auctionId: live.id, maxAmount: amount })
      setConfirm(null)
      if (!result.ok) {
        setError(tAll(result.fieldErrors?.maxAmount ?? result.error))
        return
      }
      const o = result.data
      if (o) {
        patchLiveAuction(live.id, {
          current_price: o.current_price,
          bid_count: o.bid_count,
          ends_at: o.ends_at,
          ...(o.leading ? { high_bidder_id: userId } : {}),
        })
      }
      setMyMax(bani)
      setAmount("")
      if (o?.leading) toast.success(t("placedLeading"))
      else toast.warning(t("placedOutbid"))
      if (o?.extended) toast.info(t("extended"))
    })
  }

  function runAction(
    action: () => Promise<{ ok: boolean; error?: MessageKey; message?: MessageKey }>,
  ) {
    startTransition(async () => {
      const result = await action()
      setConfirm(null)
      if (result.ok) {
        if (result.message) toast.success(tAll(result.message))
        router.refresh()
      } else if (result.error) {
        toast.error(tAll(result.error))
      }
    })
  }

  const visibleHistory = history ? (showAll ? history : history.slice(0, 5)) : []

  return (
    <>
      {/* ── Price ── */}
      <div className="relative overflow-hidden rounded-lg border p-4 md:p-5" aria-live="polite">
        {/* A new bid: the panel lights up in the accent tint and fades (opacity only). */}
        {live.current_price !== initial.current_price ? (
          <span
            key={live.current_price}
            aria-hidden
            className="absolute inset-0 animate-flash bg-tint"
          />
        ) : null}
        <p className="relative text-xs font-semibold tracking-[0.07em] text-muted-foreground uppercase">
          {live.status === "ended_sold"
            ? t("finalPrice")
            : hasBids
              ? tAll("detail.currentBid")
              : tAll("detail.startingPrice")}
        </p>
        {/* Remounts on every new price, so a fresh bid slides into place once. */}
        <p
          key={live.current_price}
          className={cn(
            "relative mt-1 text-4xl leading-tight font-bold tracking-tight text-primary",
            live.current_price !== initial.current_price && "animate-bump",
          )}
        >
          <Price bani={live.final_price ?? live.current_price} />
        </p>
        <p className="relative mt-1 flex items-center gap-1.5 text-sm text-muted-foreground">
          <Gavel aria-hidden className="size-4" />
          {hasBids ? tAll("auction.bids", { count: live.bid_count }) : tAll("detail.noBids")}
        </p>
        {live.has_reserve && isOpen ? (
          <p className="relative mt-3">
            <Badge variant={live.reserve_met ? "success" : "warning"}>
              {live.reserve_met ? <Check aria-hidden /> : <CircleDashed aria-hidden />}
              {live.reserve_met ? tAll("detail.reserveMet") : tAll("detail.reserveNotMet")}
            </Badge>
          </p>
        ) : null}
      </div>

      {/* ── Time ── */}
      {isOpen && live.ends_at ? (
        <div className="space-y-1 rounded-lg border px-4 py-3.5 md:px-5">
          <p className="text-xs font-semibold tracking-[0.07em] text-muted-foreground uppercase">
            {tAll("detail.endsIn")}
          </p>
          <Countdown
            endsAt={live.ends_at}
            className="gap-2 text-2xl font-bold tracking-tight [&_svg]:size-5"
          />
          <p className="text-xs text-muted-foreground">
            {tAll("detail.endsOn", { date: formatDateTime(live.ends_at) })}
          </p>
        </div>
      ) : live.status === "active" ? (
        <p className="rounded-lg border p-4 text-sm font-semibold">{t("closing")}</p>
      ) : (
        <EndedNote live={live} isWinner={userId !== null && live.winner_id === userId} />
      )}

      {/* ── Viewer status ── */}
      {isOpen && isSeller ? (
        <p className="rounded-lg bg-muted p-3 text-sm">{tAll("detail.yourAuction")}</p>
      ) : null}
      {isOpen && isLeader ? (
        <div className="flex items-start gap-2.5 rounded-lg bg-success-soft p-3 text-sm text-success">
          {/* Leading = your paddle is up: the brand mark doubles as the status icon. */}
          <LogoMark variant="mono" className="mt-px size-4.5" />
          <div>
            <p className="font-semibold">{t("leading")}</p>
            {myMax !== null ? <p>{t("leadingMax", { amount: price(myMax) })}</p> : null}
          </div>
        </div>
      ) : null}
      {isOpen && !isLeader && myMax !== null ? (
        <div className="flex items-start gap-2.5 rounded-lg bg-destructive-soft p-3 text-sm text-destructive">
          <ArrowDown aria-hidden className="mt-0.5 size-4 shrink-0" />
          <p className="font-semibold">{t("outbid")}</p>
        </div>
      ) : null}

      {/* ── Bid form ── */}
      {isOpen && !isSeller ? (
        viewer === null ? (
          <Button asChild size="lg" className="w-full">
            <Link href={signInHref}>
              <Gavel data-icon="inline-start" />
              {t("signInToBid")}
            </Link>
          </Button>
        ) : (
          <form
            className="space-y-3"
            onSubmit={(e) => {
              e.preventDefault()
              if (validate() !== null) setConfirm("bid")
            }}
            noValidate
          >
            <p className={cn("text-sm", isLeader && "hidden")}>
              {tAll("detail.nextBid", { amount: price(min) })}
              <span className="text-muted-foreground">
                {" · "}
                {tAll("detail.increment", { amount: price(live.min_increment) })}
              </span>
            </p>
            <div className="space-y-1.5">
              <Label htmlFor={inputId}>{isLeader ? t("raiseMax") : t("amountLabel")}</Label>
              <div className="relative">
                <Input
                  ref={inputRef}
                  id={inputId}
                  name="maxAmount"
                  inputMode="decimal"
                  autoComplete="off"
                  placeholder={toInput(
                    isLeader && myMax !== null ? myMax + live.min_increment : min,
                  )}
                  value={amount}
                  onChange={(e) => {
                    setAmount(e.target.value)
                    if (error) setError(null)
                  }}
                  aria-invalid={error ? true : undefined}
                  aria-describedby={`${inputId}-hint${error ? ` ${inputId}-error` : ""}`}
                  className="h-12 pr-14 text-lg font-semibold tabular-nums"
                  disabled={!canBid || pending}
                />
                <span className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-sm text-muted-foreground">
                  RON
                </span>
              </div>
              {error ? (
                <p id={`${inputId}-error`} className="text-sm text-destructive" role="alert">
                  {error}
                </p>
              ) : null}
              {!isLeader ? (
                <div className="flex flex-wrap gap-1.5" aria-label={t("quickPick")} role="group">
                  {quickPicks.map((q) => (
                    <Button
                      key={q}
                      type="button"
                      variant="outline"
                      size="sm"
                      className="tabular-nums"
                      disabled={!canBid || pending}
                      onClick={() => {
                        setAmount(toInput(q))
                        setError(null)
                        inputRef.current?.focus()
                      }}
                    >
                      {price(q)}
                    </Button>
                  ))}
                </div>
              ) : null}
              <p id={`${inputId}-hint`} className="text-xs text-muted-foreground">
                {t("maxHint")}
              </p>
            </div>
            <Button type="submit" size="lg" className="w-full" disabled={!canBid || pending}>
              <Gavel data-icon="inline-start" className="group-hover/button:animate-raise" />
              {isLeader ? t("raiseMaxButton") : t("placeBid")}
            </Button>
          </form>
        )
      ) : null}

      {isOpen && !isSeller && live.buy_now_price !== null && !hasBids ? (
        viewer === null ? (
          <Button asChild size="lg" variant="outline" className="w-full">
            <Link href={signInHref}>
              <ShoppingBag data-icon="inline-start" />
              {tAll("detail.buyNowPrice", { price: price(live.buy_now_price) })}
            </Link>
          </Button>
        ) : (
          <Button
            size="lg"
            variant="outline"
            className="w-full"
            disabled={!canBid || pending}
            onClick={() => setConfirm("buy")}
          >
            <ShoppingBag data-icon="inline-start" />
            {tAll("detail.buyNowPrice", { price: price(live.buy_now_price) })}
          </Button>
        )
      ) : null}

      {isOpen && isSeller && !hasBids ? (
        <Button
          variant="destructive"
          className="w-full"
          disabled={pending}
          onClick={() => setConfirm("cancel")}
        >
          <XCircle data-icon="inline-start" />
          {t("cancelAuction")}
        </Button>
      ) : null}

      {isOpen ? (
        <p className="flex items-start gap-1.5 text-xs text-muted-foreground">
          <Zap aria-hidden className="mt-0.5 size-3.5 shrink-0" />
          {t("antiSnipeHint")}
        </p>
      ) : null}

      {/* ── History ── */}
      {hasBids ? (
        <section aria-labelledby={`${inputId}-history`} className="space-y-2 border-t pt-4">
          <h2 id={`${inputId}-history`} className="flex items-center gap-1.5 text-sm font-semibold">
            <History aria-hidden className="size-4" />
            {t("history")}
          </h2>
          {history === null ? (
            <p className="text-sm text-muted-foreground">{t("loadingHistory")}</p>
          ) : (
            <ol className="space-y-1 text-sm">
              {visibleHistory.map((b, i) => (
                <li
                  key={b.id}
                  className={cn(
                    "flex items-center justify-between gap-3 rounded-md px-2.5 py-2",
                    i === 0 && "bg-muted font-semibold",
                  )}
                >
                  <span className="min-w-0 truncate">
                    {b.is_mine ? t("you") : b.bidder}
                    {b.is_auto ? (
                      <span className="ml-1.5 text-xs font-normal text-muted-foreground">
                        {t("auto")}
                      </span>
                    ) : null}
                  </span>
                  <span className="flex shrink-0 items-baseline gap-2">
                    <time
                      dateTime={b.created_at}
                      className="text-xs font-normal text-muted-foreground"
                    >
                      {formatDateTime(b.created_at)}
                    </time>
                    <span className="tabular-nums">{price(b.amount)}</span>
                  </span>
                </li>
              ))}
            </ol>
          )}
          {history && history.length > 5 ? (
            <Button
              variant="ghost"
              size="sm"
              className="w-full"
              onClick={() => setShowAll((v) => !v)}
            >
              {showAll ? t("showLess") : t("showAll", { count: history.length })}
            </Button>
          ) : null}
        </section>
      ) : null}

      {/* ── Mobile: sticky price + bid bar above the bottom navigation ── */}
      {isOpen ? (
        <>
          <div className="fixed inset-x-0 bottom-[calc(4rem+env(safe-area-inset-bottom))] z-30 border-t bg-card px-4 py-2.5 lg:hidden">
            <div className="mx-auto flex max-w-xl items-center justify-between gap-3">
              <div className="min-w-0">
                <p className="text-xs text-muted-foreground">
                  {hasBids ? tAll("detail.currentBid") : tAll("detail.startingPrice")}
                </p>
                <p className="text-lg leading-tight font-bold tracking-tight text-primary">
                  <Price bani={live.current_price} />
                </p>
              </div>
              {live.ends_at ? (
                <Countdown endsAt={live.ends_at} compact className="text-sm" />
              ) : null}
              {isSeller ? null : viewer === null ? (
                <Button asChild>
                  <Link href={signInHref}>
                    <Gavel data-icon="inline-start" />
                    {t("placeBid")}
                  </Link>
                </Button>
              ) : (
                <Button
                  disabled={!canBid}
                  onClick={() => {
                    inputRef.current?.scrollIntoView({ behavior: "smooth", block: "center" })
                    inputRef.current?.focus({ preventScroll: true })
                  }}
                >
                  <Gavel data-icon="inline-start" />
                  {t("placeBid")}
                </Button>
              )}
            </div>
          </div>
          <div aria-hidden className="h-16 lg:hidden" />
        </>
      ) : null}

      {/* ── Confirmations ── */}
      <AlertDialog open={confirm !== null} onOpenChange={(o) => !o && !pending && setConfirm(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {confirm === "buy"
                ? t("buyNowConfirmTitle")
                : confirm === "cancel"
                  ? t("cancelConfirmTitle")
                  : t("confirmTitle")}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {confirm === "buy"
                ? t("buyNowConfirmText", { price: price(live.buy_now_price ?? 0) })
                : confirm === "cancel"
                  ? t("cancelConfirmText")
                  : t("confirmText", {
                      amount: price(parseRONToBani(amount) ?? 0),
                    })}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={pending}>{t("back")}</AlertDialogCancel>
            <AlertDialogAction
              disabled={pending}
              onClick={(e) => {
                // Keep the dialog open until the server answers.
                e.preventDefault()
                if (confirm === "buy") runAction(() => buyNow(live.id))
                else if (confirm === "cancel") runAction(() => cancelAuction(live.id))
                else submitBid()
              }}
            >
              {confirm === "buy"
                ? t("buyNowConfirm")
                : confirm === "cancel"
                  ? t("cancelAuction")
                  : t("confirm")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}

function EndedNote({ live, isWinner }: { live: LiveAuction; isWinner: boolean }) {
  const t = useTranslations("detail")
  const tBid = useTranslations("bid")
  return (
    <div className="space-y-1 rounded-lg border p-4 text-sm md:px-5">
      <p className="flex items-center gap-2 font-semibold">
        <Lock aria-hidden className="size-4" />
        {live.status === "ended_sold" && live.final_price !== null
          ? t("soldFor", { price: price(live.final_price) })
          : live.status === "cancelled"
            ? t("cancelled")
            : t("unsold")}
      </p>
      {live.ends_at && live.status !== "cancelled" ? (
        <p className="text-muted-foreground">
          {t("endedOn", { date: formatDateTime(live.ends_at) })}
        </p>
      ) : null}
      {isWinner ? (
        <div className="mt-3 flex items-start gap-2.5 rounded-lg bg-success p-3 text-success-foreground">
          <Award aria-hidden className="mt-0.5 size-4 shrink-0" />
          <div>
            <p className="font-semibold">{tBid("won")}</p>
            <p>
              <Link href="/cont/castigate" className="underline underline-offset-2">
                {tBid("wonHint")}
              </Link>
            </p>
          </div>
        </div>
      ) : null}
    </div>
  )
}
