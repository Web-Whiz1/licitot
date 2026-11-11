"use client"

import { useEffect, useRef } from "react"
import "./ambient-background.css"

/**
 * The animated page background, mounted once in the root layout: soft colour blobs (palette
 * tokens `ambient-*`) drift slowly behind everything, under the paper grain and the warm light.
 *
 * - Drift is pure CSS (transform keyframes on blurred layers, so the compositor does the work).
 * - Scroll: the page fades through three scenes (top, middle, bottom) and the blobs lift a
 *   little, so the colour flows from one section to the next.
 * - Pointer (mouse only): blobs lean a few pixels towards or away from the cursor, eased.
 * - Reduced motion: a still picture, no listeners. Touch screens: slower drift, no pointer.
 *
 * JS only writes a handful of CSS variables on the root element, inside one rAF loop that
 * sleeps as soon as nothing changes.
 */

type Scene = "a" | "b" | "c"
type Blob = {
  scene: Scene
  color: "rose" | "amber" | "olive" | "blush" | "glow"
  /** Centre, in % of the viewport. */
  x: number
  y: number
  /** Width in vmax. */
  size: number
  /** Pixels moved at the edge of the screen: positive follows the cursor, negative avoids it. */
  depth: number
  /** Pixels lifted per 1000px scrolled. */
  lift: number
  drift: 1 | 2 | 3
  /** Seconds for one drift leg. */
  dur: number
  /** Skipped on small screens. */
  extra?: boolean
}

const BLOBS: Blob[] = [
  // Top of the page: rose light from the right, a cream glow on the left.
  { scene: "a", color: "rose", x: 82, y: 14, size: 52, depth: 34, lift: -26, drift: 1, dur: 38 },
  { scene: "a", color: "glow", x: 14, y: 6, size: 46, depth: -22, lift: -12, drift: 2, dur: 46 },
  { scene: "a", color: "amber", x: 30, y: 82, size: 44, depth: 18, lift: -34, drift: 3, dur: 52 },
  {
    scene: "a",
    color: "blush",
    x: 60,
    y: 55,
    size: 30,
    depth: -30,
    lift: -18,
    drift: 2,
    dur: 34,
    extra: true,
  },
  // Middle: amber and olive, as the lots go by.
  { scene: "b", color: "amber", x: 16, y: 30, size: 50, depth: 26, lift: -22, drift: 2, dur: 44 },
  { scene: "b", color: "olive", x: 86, y: 62, size: 48, depth: -28, lift: -30, drift: 1, dur: 50 },
  {
    scene: "b",
    color: "glow",
    x: 55,
    y: 10,
    size: 36,
    depth: 20,
    lift: -14,
    drift: 3,
    dur: 40,
    extra: true,
  },
  // Bottom: blush and rose, towards the footer.
  { scene: "c", color: "blush", x: 20, y: 66, size: 54, depth: -24, lift: -20, drift: 3, dur: 48 },
  { scene: "c", color: "rose", x: 80, y: 28, size: 46, depth: 30, lift: -28, drift: 2, dur: 42 },
  {
    scene: "c",
    color: "olive",
    x: 48,
    y: 92,
    size: 34,
    depth: 16,
    lift: -36,
    drift: 1,
    dur: 36,
    extra: true,
  },
]

const smooth = (from: number, to: number, x: number) => {
  const t = Math.min(1, Math.max(0, (x - from) / (to - from)))
  return t * t * (3 - 2 * t)
}

export function AmbientBackground() {
  const root = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const el = root.current
    if (!el || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return

    const finePointer = window.matchMedia("(hover: hover) and (pointer: fine)").matches
    // Current and target values: pointer (-1…1 on each axis), scroll in px, page progress 0…1.
    const now = { mx: 0, my: 0, sy: 0, p: 0 }
    const goal = { mx: 0, my: 0, sy: 0, p: 0 }
    let raf = 0

    const write = () => {
      const a = 1 - smooth(0, 0.45, now.p)
      const c = smooth(0.55, 1, now.p)
      el.style.setProperty("--mx", now.mx.toFixed(4))
      el.style.setProperty("--my", now.my.toFixed(4))
      el.style.setProperty("--sy", (now.sy / 1000).toFixed(4))
      el.style.setProperty("--a", a.toFixed(3))
      el.style.setProperty("--b", (1 - a - c).toFixed(3))
      el.style.setProperty("--c", c.toFixed(3))
    }

    const tick = () => {
      let moving = false
      for (const k of ["mx", "my", "sy", "p"] as const) {
        const d = goal[k] - now[k]
        const rest = k === "sy" ? 0.5 : 0.001
        if (Math.abs(d) > rest) {
          now[k] += d * 0.07
          moving = true
        } else {
          now[k] = goal[k]
        }
      }
      write()
      raf = moving ? requestAnimationFrame(tick) : 0
    }
    const wake = () => {
      if (!raf) raf = requestAnimationFrame(tick)
    }

    const onScroll = () => {
      const max = document.documentElement.scrollHeight - window.innerHeight
      goal.sy = window.scrollY
      goal.p = max > 0 ? Math.min(1, window.scrollY / max) : 0
      wake()
    }
    const onPointer = (e: PointerEvent) => {
      if (e.pointerType !== "mouse") return
      goal.mx = (e.clientX / window.innerWidth) * 2 - 1
      goal.my = (e.clientY / window.innerHeight) * 2 - 1
      wake()
    }
    const onLeave = () => {
      goal.mx = 0
      goal.my = 0
      wake()
    }

    onScroll()
    window.addEventListener("scroll", onScroll, { passive: true })
    window.addEventListener("resize", onScroll, { passive: true })
    if (finePointer) {
      window.addEventListener("pointermove", onPointer, { passive: true })
      document.documentElement.addEventListener("pointerleave", onLeave)
    }
    return () => {
      cancelAnimationFrame(raf)
      window.removeEventListener("scroll", onScroll)
      window.removeEventListener("resize", onScroll)
      window.removeEventListener("pointermove", onPointer)
      document.documentElement.removeEventListener("pointerleave", onLeave)
    }
  }, [])

  return (
    <div ref={root} aria-hidden className="ambient">
      {BLOBS.map((b, i) => (
        <span
          key={i}
          className="ambient-blob"
          data-extra={b.extra ? "" : undefined}
          style={
            {
              "--x": `${b.x}%`,
              "--y": `${b.y}%`,
              "--size": `${b.size}vmax`,
              "--depth": b.depth,
              "--lift": b.lift,
              "--color": `var(--ambient-${b.color})`,
              "--dur": `${b.dur}s`,
              "--delay": `${-((i * 7) % b.dur)}s`,
              opacity: `var(--${b.scene})`,
            } as React.CSSProperties
          }
        >
          <i className={`ambient-drift-${b.drift}`} />
        </span>
      ))}
      {/* Paper grain over the colour (it also hides banding), then the light and vignette. */}
      <div className="absolute inset-0 page-paper" />
      <div className="absolute inset-0 page-light" />
    </div>
  )
}
