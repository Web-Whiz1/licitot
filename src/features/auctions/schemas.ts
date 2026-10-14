import { z } from "zod"
import { msg } from "@/i18n/keys"
import { COUNTY_CODES } from "@/lib/counties"
import { parseRONToBani } from "@/lib/money"
import {
  DURATIONS,
  ITEM_CONDITIONS,
  MAX_COURIER_COST,
  MAX_IMAGES,
  MAX_INCREMENT,
  MAX_PRICE,
  MIN_INCREMENT,
  MIN_PRICE,
} from "./constants"

// The form works with strings (what the user types, e.g. "1.250,50"); the schema outputs bani.

export const money = (min: number, max: number) =>
  z
    .string()
    .trim()
    .transform((v, ctx) => {
      const bani = parseRONToBani(v)
      if (bani === null) {
        ctx.addIssue({ code: "custom", message: msg("validation.price") })
        return z.NEVER
      }
      return bani
    })
    .pipe(z.number().min(min, msg("validation.priceMin")).max(max, msg("validation.priceMax")))

const optionalMoney = (min: number, max: number) =>
  z.union([z.literal("").transform(() => null), money(min, max)])

export const auctionImageSchema = z.object({
  fileId: z.string().regex(/^[A-Za-z0-9_-]{1,64}$/),
  path: z.string().max(300),
  width: z.number().int().positive().nullable(),
  height: z.number().int().positive().nullable(),
  blurDataUrl: z
    .string()
    .max(3000)
    .regex(/^data:image\/(webp|jpeg|png);base64,[A-Za-z0-9+/=]+$/)
    .nullable(),
})
export type AuctionImage = z.infer<typeof auctionImageSchema>

export const auctionFormSchema = z
  .object({
    title: z.string().trim().min(5, msg("validation.title")).max(80, msg("validation.title")),
    description: z
      .string()
      .trim()
      .min(20, msg("validation.description"))
      .max(5000, msg("validation.description")),
    categoryId: z.string().regex(/^\d+$/, msg("validation.category")).transform(Number),
    condition: z.enum(ITEM_CONDITIONS, msg("validation.condition")),
    startingPrice: money(MIN_PRICE, MAX_PRICE),
    minIncrement: money(MIN_INCREMENT, MAX_INCREMENT),
    reservePrice: optionalMoney(MIN_PRICE, MAX_PRICE),
    buyNowPrice: optionalMoney(MIN_PRICE, MAX_PRICE),
    durationDays: z
      .string()
      .transform(Number)
      .pipe(
        z
          .number()
          .refine(
            (n): n is (typeof DURATIONS)[number] => (DURATIONS as readonly number[]).includes(n),
            {
              message: msg("validation.duration"),
            },
          ),
      ),
    countyCode: z.enum(COUNTY_CODES, msg("validation.county")),
    city: z.string().trim().min(1, msg("validation.cityRequired")).max(80, msg("validation.city")),
    shipPickup: z.boolean(),
    shipCourier: z.boolean(),
    courierCost: optionalMoney(0, MAX_COURIER_COST),
    images: z.array(auctionImageSchema).max(MAX_IMAGES, msg("validation.imagesMax")),
  })
  .superRefine((v, ctx) => {
    if (v.reservePrice !== null && v.reservePrice < v.startingPrice) {
      ctx.addIssue({
        code: "custom",
        path: ["reservePrice"],
        message: msg("validation.reserveBelowStart"),
      })
    }
    if (v.buyNowPrice !== null) {
      const floor = Math.max(v.startingPrice + 1, v.reservePrice ?? 0)
      if (v.buyNowPrice < floor) {
        ctx.addIssue({
          code: "custom",
          path: ["buyNowPrice"],
          message: msg("validation.buyNowTooLow"),
        })
      }
    }
    if (!v.shipPickup && !v.shipCourier) {
      ctx.addIssue({ code: "custom", path: ["shipPickup"], message: msg("validation.shipping") })
    }
    if (v.shipCourier && v.courierCost === null) {
      ctx.addIssue({
        code: "custom",
        path: ["courierCost"],
        message: msg("validation.courierCost"),
      })
    }
  })

export type AuctionFormInput = z.input<typeof auctionFormSchema>
export type AuctionFormOutput = z.output<typeof auctionFormSchema>
