import { Search } from "lucide-react"
import Form from "next/form"
import { useTranslations } from "next-intl"
import { Input } from "@/components/ui/input"
import { cn } from "@/lib/utils"

/** GET form to /cauta. Works without JS; next/form adds client-side navigation. */
export function SearchForm({ className, id }: { className?: string; id: string }) {
  const t = useTranslations("search")

  return (
    <Form action="/cauta" role="search" className={cn("relative w-full", className)}>
      <label htmlFor={id} className="sr-only">
        {t("label")}
      </label>
      <Search
        aria-hidden
        className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground"
      />
      <Input
        id={id}
        name="q"
        type="search"
        enterKeyHint="search"
        autoComplete="off"
        placeholder={t("placeholder")}
        className="rounded-full bg-muted pl-9 dark:bg-muted"
      />
    </Form>
  )
}
