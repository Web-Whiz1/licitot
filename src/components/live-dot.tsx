import { cn } from "@/lib/utils"

/**
 * The brand's "live" signal: a small dot in the current text color. `pulse` adds a ping ring
 * (transform + opacity only, so it stays on the compositor; reduced motion stops it).
 */
export function LiveDot({ className, pulse = false }: { className?: string; pulse?: boolean }) {
  return (
    <span aria-hidden className={cn("relative inline-flex size-2 shrink-0", className)}>
      {pulse ? (
        <span className="absolute inset-0 animate-ping rounded-full bg-current opacity-60" />
      ) : null}
      <span className="relative inline-flex size-full rounded-full bg-current" />
    </span>
  )
}
