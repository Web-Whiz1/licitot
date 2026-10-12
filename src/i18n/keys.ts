import type messages from "../../messages/ro.json"

type Leaves<T, P extends string = ""> = {
  [K in keyof T & string]: T[K] extends string
    ? `${P}${K}`
    : T[K] extends readonly unknown[]
      ? never
      : Leaves<T[K], `${P}${K}.`>
}[keyof T & string]

/** Every leaf key in messages/ro.json, e.g. "auth.errors.generic". */
export type MessageKey = Leaves<typeof messages>
export type ValidationKey = Extract<MessageKey, `validation.${string}`>

/**
 * Identity helper that type-checks a message key. Zod schemas and server actions return
 * keys (not text) so the same schema works on server and client and stays translatable.
 */
export const msg = <K extends MessageKey>(key: K): K => key
