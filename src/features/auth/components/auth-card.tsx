import Link from "next/link"
import { LogoMark } from "@/components/brand/logo"

/** Centered card shell shared by sign-in, sign-up and password pages. */
export function AuthCard({
  title,
  subtitle,
  children,
  footer,
}: {
  title: string
  subtitle?: string
  children: React.ReactNode
  footer?: React.ReactNode
}) {
  return (
    <div className="mx-auto w-full max-w-md px-4 py-10 md:py-16">
      <div className="rounded-lg border bg-card p-6 sm:p-9">
        <div className="mb-7 space-y-3 text-center">
          <Link href="/" className="mx-auto inline-block rounded-md" aria-hidden tabIndex={-1}>
            <LogoMark className="mx-auto size-12" />
          </Link>
          <h1 className="font-display text-3xl tracking-[-0.02em]">{title}</h1>
          {subtitle ? <p className="text-sm text-muted-foreground">{subtitle}</p> : null}
        </div>
        {children}
      </div>
      {footer ? <div className="mt-6 text-center text-sm">{footer}</div> : null}
    </div>
  )
}

export function OrDivider({ label }: { label: string }) {
  return (
    <div className="my-5 flex items-center gap-3 text-xs text-muted-foreground uppercase">
      <span className="h-px flex-1 bg-border" />
      {label}
      <span className="h-px flex-1 bg-border" />
    </div>
  )
}
