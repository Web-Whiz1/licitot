import type { z } from "zod"
import type { MessageKey } from "@/i18n/keys"

/** Uniform Server Action result. All messages are dictionary keys, translated in the UI. */
export type ActionResult<T = undefined> =
  | { ok: true; data?: T; message?: MessageKey }
  // `data` on failure: partial progress the client still needs (e.g. a draft saved before
  // publishing failed).
  | { ok: false; error: MessageKey; fieldErrors?: Record<string, MessageKey>; data?: T }

export function fail(
  error: MessageKey,
  fieldErrors?: Record<string, MessageKey>,
): ActionResult<never> {
  return { ok: false, error, fieldErrors }
}

/** Flattens Zod issues to { field: firstMessageKey }. Schemas only ever emit dictionary keys. */
export function zodFieldErrors(error: z.ZodError): Record<string, MessageKey> {
  const out: Record<string, MessageKey> = {}
  for (const issue of error.issues) {
    const field = issue.path.join(".") || "_"
    out[field] ??= issue.message as MessageKey
  }
  return out
}
