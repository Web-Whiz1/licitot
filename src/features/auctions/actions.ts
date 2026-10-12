"use server"

import { updateTag } from "next/cache"
import { after } from "next/server"
import { redirect } from "next/navigation"
import { fail, zodFieldErrors, type ActionResult } from "@/lib/action-result"
import type { MessageKey } from "@/i18n/keys"
import { isOwnPath } from "@/lib/imagekit"
import { deleteFile, verifyUploadedImage } from "@/lib/imagekit.server"
import { createClient } from "@/lib/supabase/server"
import type { Database } from "@/types/database"
import { AUCTIONS_TAG } from "./listing"
import { auctionFormSchema, type AuctionFormInput, type AuctionFormOutput } from "./schemas"

type AuctionWrite = Database["public"]["Tables"]["auctions"]["Insert"]

/** Postgres raises `P0001` with a stable code in the message (see publish_auction()). */
const RPC_ERRORS = new Set([
  "auction_not_found",
  "auction_not_draft",
  "auction_not_editable",
  "user_banned",
  "connect_required",
  "images_required",
  "too_many_images",
])

function rpcErrorKey(message: string | undefined): MessageKey {
  return message && RPC_ERRORS.has(message)
    ? (`sell.errors.${message}` as MessageKey)
    : "auth.errors.generic"
}

function toRow(v: AuctionFormOutput): Omit<AuctionWrite, "seller_id"> {
  return {
    title: v.title,
    description: v.description,
    category_id: v.categoryId,
    condition: v.condition,
    starting_price: v.startingPrice,
    min_increment: v.minIncrement,
    reserve_price: v.reservePrice,
    buy_now_price: v.buyNowPrice,
    duration_days: v.durationDays,
    county_code: v.countyCode,
    city: v.city,
    ship_pickup: v.shipPickup,
    ship_courier: v.shipCourier,
    courier_cost: v.shipCourier ? v.courierCost : null,
  }
}

/** Insert or update a draft and its images. Returns the auction id. */
async function persistDraft(
  id: string | null,
  input: AuctionFormInput,
): Promise<ActionResult<{ id: string }>> {
  const parsed = auctionFormSchema.safeParse(input)
  if (!parsed.success) return fail("auth.errors.generic", zodFieldErrors(parsed.error))
  const values = parsed.data

  const supabase = await createClient()
  const { data: claims } = await supabase.auth.getClaims()
  const userId = claims?.claims?.sub
  if (!userId) return fail("auth.errors.generic")

  // Every photo must be the user's own upload and really exist in ImageKit.
  const checks = await Promise.all(
    values.images.map(async (img) =>
      isOwnPath(img.path, "auction", userId) ? verifyUploadedImage(img.fileId, img.path) : null,
    ),
  )
  if (checks.some((c) => c === null)) {
    return fail("sell.errors.images_invalid", { images: "sell.errors.images_invalid" })
  }

  let auctionId = id
  let previousFileIds: string[] = []

  if (auctionId) {
    const { data: existing } = await supabase
      .from("auction_images")
      .select("file_id")
      .eq("auction_id", auctionId)
    previousFileIds = (existing ?? []).map((r) => r.file_id)

    const { data, error } = await supabase
      .from("auctions")
      .update(toRow(values))
      .eq("id", auctionId)
      .select("id")
    if (error) {
      console.error("[auctions.update]", error.code, error.message)
      return fail("auth.errors.generic")
    }
    if (!data?.length) return fail("sell.errors.auction_not_editable")
  } else {
    const { data, error } = await supabase
      .from("auctions")
      .insert(toRow(values))
      .select("id")
      .single()
    if (error) {
      console.error("[auctions.insert]", error.code, error.message)
      return fail("auth.errors.generic")
    }
    auctionId = data.id
  }

  const { error: imagesError } = await supabase.rpc("replace_auction_images", {
    p_auction_id: auctionId,
    p_images: values.images.map((img, i) => ({
      file_id: img.fileId,
      path: img.path,
      // Dimensions come from ImageKit, not from the client.
      width: checks[i]?.width ?? null,
      height: checks[i]?.height ?? null,
      blur_data_url: img.blurDataUrl,
    })),
  })
  if (imagesError) {
    console.error("[auctions.images]", imagesError.code, imagesError.message)
    return fail(rpcErrorKey(imagesError.message))
  }

  // Delete photos the seller removed from this draft (after the response is sent).
  const kept = new Set(values.images.map((i) => i.fileId))
  const removed = previousFileIds.filter((f) => !kept.has(f))
  if (removed.length) after(() => Promise.all(removed.map(deleteFile)))

  return { ok: true, data: { id: auctionId } }
}

export async function saveDraft(
  id: string | null,
  input: AuctionFormInput,
): Promise<ActionResult<{ id: string }>> {
  const result = await persistDraft(id, input)
  return result.ok ? { ...result, message: "sell.draftSaved" } : result
}

export async function publishAuction(
  id: string | null,
  input: AuctionFormInput,
): Promise<ActionResult<{ id: string }>> {
  if (input.images.length === 0) {
    return fail("validation.imagesRequired", { images: "validation.imagesRequired" })
  }
  const saved = await persistDraft(id, input)
  if (!saved.ok || !saved.data) return saved

  const supabase = await createClient()
  const { error } = await supabase.rpc("publish_auction", { p_auction_id: saved.data.id })
  if (error) {
    console.error("[auctions.publish]", error.code, error.message)
    // The draft was saved; return its id so the form switches to edit mode.
    return { ok: false, error: rpcErrorKey(error.message), data: saved.data }
  }

  // New live auction: refresh cached listings (home, search, categories, seller pages).
  updateTag(AUCTIONS_TAG)
  redirect("/cont/licitatii?publicat=1")
}

export async function deleteDraft(id: string): Promise<ActionResult> {
  const supabase = await createClient()
  const { data: images } = await supabase
    .from("auction_images")
    .select("file_id")
    .eq("auction_id", id)

  const { data, error } = await supabase.from("auctions").delete().eq("id", id).select("id")
  if (error || !data?.length) return fail("sell.errors.auction_not_editable")

  const fileIds = (images ?? []).map((i) => i.file_id)
  if (fileIds.length) after(() => Promise.all(fileIds.map(deleteFile)))
  return { ok: true, message: "auction.deleted" }
}
