import { Search } from "lucide-react"
import Form from "next/form"
import { useTranslations } from "next-intl"
import { Input } from "@/components/ui/input"
import { cn } from "@/lib/utils"

/** GET form to /cauta. Works without JS; next/form adds client-side navigation. */
export function SearchForm({
  className,
  id,
  size = "default",
}: {
  className?: string
  id: string
  /** `lg`: the big search field in the home hero. */
  size?: "default" | "lg"
}) {
  const t = useTranslations("search")

  return (
    <Form action="/cauta" role="search" className={cn("relative w-full", className)}>
      <label htmlFor={id} className="sr-only">
        {t("label")}
      </label>
      <Search
        aria-hidden
        className={cn(
          "pointer-events-none absolute top-1/2 -translate-y-1/2 text-muted-foreground",
          size === "lg" ? "left-5 size-5" : "left-4 size-4",
        )}
      />
      <Input
        id={id}
        name="q"
        type="search"
        enterKeyHint="search"
        autoComplete="off"
        placeholder={t("placeholder")}
        className={cn(
          "rounded-full",
          size === "lg"
            ? "h-14 border-transparent bg-card pr-5 pl-13 text-base md:text-base"
            : "border-transparent bg-muted pl-10 hover:border-border focus-visible:bg-card",
        )}
      />
    </Form>
  )
}
