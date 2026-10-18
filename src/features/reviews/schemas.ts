import { z } from "zod"
import { msg } from "@/i18n/keys"

export const reviewSchema = z.object({
  orderId: z.uuid(),
  rating: z.coerce
    .number({ error: msg("reviews.errors.rating") })
    .int(msg("reviews.errors.rating"))
    .min(1, msg("reviews.errors.rating"))
    .max(5, msg("reviews.errors.rating")),
  comment: z.string().trim().max(1000, msg("reviews.errors.comment")),
})
