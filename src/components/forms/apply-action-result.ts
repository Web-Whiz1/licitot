import type { FieldValues, Path, UseFormReturn } from "react-hook-form"
import type { MessageKey } from "@/i18n/keys"
import type { ActionResult } from "@/lib/action-result"

/**
 * Copies server-side field errors into React Hook Form and returns the form-level error key
 * (if any). Server Actions re-validate with the same Zod schema, so field names match.
 */
export function applyActionResult<T extends FieldValues, TOut extends FieldValues = T>(
  form: UseFormReturn<T, unknown, TOut>,
  result: ActionResult<unknown> | undefined,
): MessageKey | undefined {
  if (!result || result.ok) return undefined
  const fieldErrors = Object.entries(result.fieldErrors ?? {})
  for (const [field, message] of fieldErrors) {
    form.setError(field as Path<T>, { type: "server", message })
  }
  // When the problem is a specific field, the inline message is enough.
  return fieldErrors.length > 0 ? undefined : result.error
}
