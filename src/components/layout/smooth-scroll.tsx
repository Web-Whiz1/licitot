"use client"

import { useEffect } from "react"

/**
 * Smooth wheel scrolling (Lenis) on devices with a mouse or trackpad. Phones keep native
 * touch scrolling, and nothing loads when the visitor prefers reduced motion. Lenis is
 * imported after hydration, so it never delays the first render.
 */
export function SmoothScroll() {
  useEffect(() => {
    const fine = window.matchMedia("(hover: hover) and (pointer: fine)")
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)")
    if (!fine.matches || reduce.matches) return

    let lenis: import("lenis").default | undefined
    let cancelled = false
    void import("lenis").then(({ default: Lenis }) => {
      if (cancelled) return
      lenis = new Lenis({
        autoRaf: true,
        lerp: 0.1,
        // Lists inside menus, selects and scrollable rows scroll on their own.
        allowNestedScroll: true,
        // A click on an internal link stops any running glide, so the new page starts at the top.
        stopInertiaOnNavigate: true,
        // Open menus and dialogs lock the page (Radix marks <body>): leave the wheel to them.
        virtualScroll: () => !document.body.hasAttribute("data-scroll-locked"),
      })
    })
    return () => {
      cancelled = true
      lenis?.destroy()
    }
  }, [])

  return null
}
