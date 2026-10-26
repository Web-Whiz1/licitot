"use client"

import { Eye, EyeOff } from "@/components/icons"
import { useTranslations } from "next-intl"
import { useState } from "react"
import { Input } from "@/components/ui/input"

export function PasswordInput(props: Omit<React.ComponentProps<typeof Input>, "type">) {
  const t = useTranslations("auth")
  const [visible, setVisible] = useState(false)
  return (
    <div className="relative">
      <Input {...props} type={visible ? "text" : "password"} className="pr-11" />
      <button
        type="button"
        onClick={() => setVisible((v) => !v)}
        aria-label={visible ? t("hidePassword") : t("showPassword")}
        aria-pressed={visible}
        className="absolute top-1/2 right-1 grid size-9 -translate-y-1/2 place-items-center rounded-md text-muted-foreground hover:text-foreground"
      >
        {visible ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
      </button>
    </div>
  )
}
