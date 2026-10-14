"use client"

import { useSyncExternalStore } from "react"
import { createClient } from "@/lib/supabase/client"

/** Auction fields that change while the page is open (kept in sync through Realtime). */
export type LiveAuction = {
  id: string
  seller_id: string
  status: "draft" | "active" | "ended_sold" | "ended_unsold" | "cancelled"
  starting_price: number
  min_increment: number
  buy_now_price: number | null
  current_price: number
  bid_count: number
  high_bidder_id: string | null
  ends_at: string | null
  has_reserve: boolean | null
  reserve_met: boolean | null
  final_price: number | null
  winner_id: string | null
  updated_at: string
}

const LIVE_COLUMNS =
  "id, seller_id, status, starting_price, min_increment, buy_now_price, current_price, bid_count, high_bidder_id, ends_at, has_reserve, reserve_met, final_price, winner_id, updated_at"
const KEYS = LIVE_COLUMNS.split(", ") as (keyof LiveAuction)[]

// One entry per auction, shared by every component showing it. This matters while the page
// streams: the Suspense fallback and the final bid box are briefly both mounted, and the
// server-rendered `initial` may be a cached (older) row. Newest `updated_at` always wins.
type Entry = {
  value: LiveAuction
  listeners: Set<() => void>
  stop?: () => void
  stopTimer?: ReturnType<typeof setTimeout>
}
const entries = new Map<string, Entry>()

const isNewer = (a: LiveAuction, b: LiveAuction) => a.updated_at > b.updated_at

function entryFor(initial: LiveAuction): Entry {
  let entry = entries.get(initial.id)
  if (!entry) {
    entry = { value: initial, listeners: new Set() }
    entries.set(initial.id, entry)
  } else if (isNewer(initial, entry.value)) {
    entry.value = initial
  }
  return entry
}

function publish(entry: Entry, next: LiveAuction) {
  entry.value = next
  entry.listeners.forEach((l) => l())
}

/** Merges fields into the shared row (Realtime payloads, fresh reads, own bid results). */
export function patchLiveAuction(id: string, patch: Partial<LiveAuction>) {
  const entry = entries.get(id)
  if (!entry) return
  const picked: Partial<LiveAuction> = {}
  for (const key of KEYS) if (key in patch) Object.assign(picked, { [key]: patch[key] })
  const next = { ...entry.value, ...picked }
  // Ignore rows older than what we already show (out-of-order delivery).
  if (patch.updated_at && entry.value.updated_at > patch.updated_at) return
  publish(entry, next)
}

function start(id: string): () => void {
  const supabase = createClient()
  let alive = true
  const refresh = async () => {
    const { data } = await supabase.from("auctions").select(LIVE_COLUMNS).eq("id", id).maybeSingle()
    if (alive && data) patchLiveAuction(id, data as LiveAuction)
  }
  const channel = supabase
    .channel(`auction:${id}`)
    .on(
      "postgres_changes",
      { event: "UPDATE", schema: "public", table: "auctions", filter: `id=eq.${id}` },
      (payload) => patchLiveAuction(id, payload.new as Partial<LiveAuction>),
    )
    .subscribe((status) => {
      // (Re)subscribed: catch up on anything missed while disconnected.
      if (status === "SUBSCRIBED") void refresh()
    })
  const onVisible = () => {
    if (document.visibilityState === "visible") void refresh()
  }
  document.addEventListener("visibilitychange", onVisible)
  return () => {
    alive = false
    document.removeEventListener("visibilitychange", onVisible)
    void supabase.removeChannel(channel)
  }
}

/** Live auction row: server value first, then Realtime. One subscription per auction. */
export function useLiveAuction(initial: LiveAuction): LiveAuction {
  const entry = entryFor(initial)
  return useSyncExternalStore(
    (listener) => {
      entry.listeners.add(listener)
      if (entry.stopTimer) clearTimeout(entry.stopTimer)
      entry.stop ??= start(initial.id)
      return () => {
        entry.listeners.delete(listener)
        if (entry.listeners.size === 0) {
          // Grace period: the streamed bid box replaces the fallback right after unmount.
          entry.stopTimer = setTimeout(() => {
            entry.stop?.()
            entry.stop = undefined
            entries.delete(initial.id)
          }, 2_000)
        }
      }
    },
    () => entry.value,
    () => initial,
  )
}
