"use client"

import { useTranslations } from "next-intl"
import { useEffect, useRef, useState } from "react"
import { cn } from "@/lib/utils"
import { INTRO_STORAGE_KEY } from "../boot"
import type { Stage } from "../scene"

const HOLD_SECONDS = 5

/**
 * The first-visit intro: the curtains part, the paddle rises and stays for five seconds, then it
 * sinks back, the curtains close and the overlay fades away. Shown once per browser; "Intră pe
 * site" or Escape skips it. Until the 3D scene is ready, the overlay shows a still of the
 * closed curtains.
 */
export function SiteIntro() {
  const t = useTranslations("intro")
  const overlay = useRef<HTMLDivElement>(null)
  const canvas = useRef<HTMLCanvasElement>(null)
  const finishRef = useRef<() => void>(() => {})
  const [ready, setReady] = useState(false)

  useEffect(() => {
    const root = document.documentElement
    const el = overlay.current
    const cv = canvas.current
    if (!root.hasAttribute("data-intro") || !el || !cv) return

    let stage: Stage | undefined
    let done = false
    try {
      localStorage.setItem(INTRO_STORAGE_KEY, "1")
    } catch {
      // Private mode: the intro may show again next time; nothing else depends on it.
    }

    const finish = () => {
      if (done) return
      done = true
      el.dataset.leaving = ""
      window.setTimeout(() => {
        root.removeAttribute("data-intro")
        stage?.dispose()
        stage = undefined
      }, 700)
    }
    finishRef.current = finish

    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") finish()
    }
    window.addEventListener("keydown", onKey)
    const ro = new ResizeObserver(() => stage?.resize())
    ro.observe(el)

    void import("../scene")
      .then(({ createStage }) => {
        if (done) return
        stage = createStage(cv, { onFirstFrame: () => setReady(true) })
        stage.setActive(true)
        stage.play({ hold: HOLD_SECONDS, onDone: finish })
      })
      .catch(finish)

    return () => {
      window.removeEventListener("keydown", onKey)
      ro.disconnect()
      stage?.dispose()
    }
  }, [])

  return (
    <div
      ref={overlay}
      className={cn(
        // Always a dark room: `dark` flips the tokens inside.
        "site-intro dark fixed inset-0 z-[100] bg-black text-foreground transition-opacity duration-700 ease-out",
        "data-[leaving]:pointer-events-none data-[leaving]:opacity-0",
      )}
    >
      {/* eslint-disable-next-line @next/next/no-img-element -- full-screen still, sized by CSS */}
      <img
        src="/brand/intro-curtain.webp"
        alt=""
        aria-hidden
        decoding="async"
        className="absolute inset-0 size-full object-cover"
      />
      <canvas
        ref={canvas}
        aria-hidden
        className={cn(
          "absolute inset-0 size-full transition-opacity duration-500 ease-out",
          ready ? "opacity-100" : "opacity-0",
        )}
      />
      <button
        type="button"
        onClick={() => finishRef.current()}
        className="absolute right-4 bottom-[calc(1rem+env(safe-area-inset-bottom))] rounded-md border border-foreground/25 px-4 py-2.5 text-sm font-semibold text-foreground/85 transition-colors duration-150 ease-out hover:border-foreground/50 hover:text-foreground md:right-8 md:bottom-8"
      >
        {t("skip")}
      </button>
    </div>
  )
}
