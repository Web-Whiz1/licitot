import { ChevronDown } from "@/components/icons"
import { cn } from "@/lib/utils"

/** Styled native <select>: best on mobile (system picker) and for long lists like counties. */
export function NativeSelect({ className, children, ...props }: React.ComponentProps<"select">) {
  return (
    <div className="relative">
      <select
        data-slot="native-select"
        className={cn(
          "h-11 w-full appearance-none rounded-md border border-input bg-card py-1 pr-10 pl-3.5 text-base transition-[border-color,box-shadow] duration-150 ease-out outline-none hover:border-[color-mix(in_oklch,var(--input),var(--foreground)_35%)] focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/20 aria-invalid:border-destructive aria-invalid:ring-3 aria-invalid:ring-destructive/15 md:text-sm",
          // The open list is drawn by the OS: give options solid theme colors so they stay
          // readable in dark mode (a translucent select background would leave them white).
          "[&_optgroup]:bg-popover [&_optgroup]:text-popover-foreground [&_option]:bg-popover [&_option]:text-popover-foreground",
          className,
        )}
        {...props}
      >
        {children}
      </select>
      <ChevronDown
        aria-hidden
        className="pointer-events-none absolute top-1/2 right-3.5 size-4 -translate-y-1/2 text-muted-foreground"
      />
    </div>
  )
}
