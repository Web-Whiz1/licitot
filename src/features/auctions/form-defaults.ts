import type { Database } from "@/types/database"
import { DEFAULT_DURATION } from "./constants"
import type { AuctionFormInput } from "./schemas"

type Draft = Pick<
  Database["public"]["Tables"]["auctions"]["Row"],
  | "title"
  | "description"
  | "category_id"
  | "condition"
  | "starting_price"
  | "min_increment"
  | "reserve_price"
  | "buy_now_price"
  | "duration_days"
  | "county_code"
  | "city"
  | "ship_pickup"
  | "ship_courier"
  | "courier_cost"
> & {
  auction_images: {
    file_id: string
    path: string
    width: number | null
    height: number | null
    blur_data_url: string | null
  }[]
}

/** Bani → editable RON string ("1250.5" → shown as typed; parse accepts both separators). */
const ron = (bani: number | null) =>
  bani === null ? "" : (bani / 100).toString().replace(".", ",")

export function emptyAuctionForm(location: {
  countyCode: string | null
  city: string | null
}): AuctionFormInput {
  return {
    title: "",
    description: "",
    categoryId: "",
    condition: "folosit",
    startingPrice: "",
    minIncrement: "",
    reservePrice: "",
    buyNowPrice: "",
    durationDays: String(DEFAULT_DURATION),
    countyCode: (location.countyCode ?? "") as AuctionFormInput["countyCode"],
    city: location.city ?? "",
    shipPickup: true,
    shipCourier: false,
    courierCost: "",
    images: [],
  }
}

export function draftToForm(d: Draft): AuctionFormInput {
  return {
    title: d.title,
    description: d.description,
    categoryId: String(d.category_id),
    condition: d.condition,
    startingPrice: ron(d.starting_price),
    minIncrement: ron(d.min_increment),
    reservePrice: ron(d.reserve_price),
    buyNowPrice: ron(d.buy_now_price),
    durationDays: String(d.duration_days),
    countyCode: d.county_code as AuctionFormInput["countyCode"],
    city: d.city,
    shipPickup: d.ship_pickup,
    shipCourier: d.ship_courier,
    courierCost: ron(d.courier_cost),
    images: d.auction_images.map((i) => ({
      fileId: i.file_id,
      path: i.path,
      width: i.width,
      height: i.height,
      blurDataUrl: i.blur_data_url,
    })),
  }
}
