"use client"

import { useEffect, useRef, useState } from "react"
import { cn } from "@/lib/utils"
import type { Stage, StageState } from "../stage/scene"

function webglAvailable(): boolean {
  try {
    const c = document.createElement("canvas")
    return Boolean(c.getContext("webgl2"))
  } catch {
    return false
  }
}

/**
 * The 3D stage of "Cine suntem?". Until the scene is ready (and wherever WebGL is missing)
 * the poster shows the same stage, so nothing jumps. The scene module (three.js) is fetched
 * only when the section comes near the viewport, renders only while visible, and the
 * curtains part once 40% of it is on screen. Reduced motion: a still of the open stage.
 */
export function CurtainStage({
  posterClosed,
  posterOpen,
  initial,
  className,
  style,
}: {
  posterClosed: string
  posterOpen: string
  /** Fixed state without animation (used to render the posters). */
  initial?: StageState
  className?: string
  style?: React.CSSProperties
}) {
  const wrap = useRef<HTMLDivElement>(null)
  const canvas = useRef<HTMLCanvasElement>(null)
  const [ready, setReady] = useState(false)

  useEffect(() => {
    const el = wrap.current
    const cv = canvas.current
    if (!el || !cv) return
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches
    if (!webglAvailable()) {
      // No 3D: keep the still of the open stage (a DOM flag, read by CSS below).
      el.dataset.still = "open"
      return
    }

    let stage: Stage | undefined
    let cancelled = false
    let visible = false
    let shouldOpen = false

    const load = () => {
      void import("../stage/scene").then(({ createStage }) => {
        if (cancelled) return
        stage = createStage(cv, {
          reducedMotion: reduced,
          initial,
          onFirstFrame: () => setReady(true),
        })
        stage.setActive(visible)
        if (shouldOpen && !initial) stage.open()
      })
    }

    const near = new IntersectionObserver(
      ([e]) => {
        if (e?.isIntersecting) {
          near.disconnect()
          load()
        }
      },
      { rootMargin: "900px 0px" },
    )
    near.observe(el)

    const seen = new IntersectionObserver(
      ([e]) => {
        if (!e) return
        visible = e.isIntersecting
        stage?.setActive(visible)
        if (e.intersectionRatio >= 0.4 && !shouldOpen) {
          shouldOpen = true
          if (!initial) stage?.open()
        }
      },
      { threshold: [0, 0.4] },
    )
    seen.observe(el)

    const ro = new ResizeObserver(() => stage?.resize())
    ro.observe(el)

    return () => {
      cancelled = true
      near.disconnect()
      seen.disconnect()
      ro.disconnect()
      stage?.dispose()
    }
  }, [initial])

  return (
    <div
      ref={wrap}
      style={style}
      className={cn("group relative isolate overflow-hidden bg-[#060404]", className)}
    >
      {/* Stills: the closed stage until the scene runs; the open one for reduced motion or
          without WebGL. Hidden lazy images are never downloaded. */}
      {/* eslint-disable-next-line @next/next/no-img-element -- full-bleed still, sized by CSS */}
      <img
        src={posterClosed}
        alt=""
        aria-hidden
        decoding="async"
        loading="lazy"
        className={cn(
          "absolute inset-0 size-full object-cover group-data-[still=open]:hidden motion-reduce:hidden",
          initial === "open" && "hidden",
        )}
      />
      {/* eslint-disable-next-line @next/next/no-img-element -- full-bleed still, sized by CSS */}
      <img
        src={posterOpen}
        alt=""
        aria-hidden
        decoding="async"
        loading="lazy"
        className={cn(
          "absolute inset-0 hidden size-full object-cover group-data-[still=open]:block motion-reduce:block",
          initial === "open" && "block",
        )}
      />
      <canvas
        ref={canvas}
        aria-hidden
        className={cn(
          "absolute inset-0 size-full transition-opacity duration-500 ease-out",
          ready ? "opacity-100" : "opacity-0",
        )}
      />
    </div>
  )
}
