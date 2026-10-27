// Shared by the site layout (server) and the intro (client): plain module, so the server gets
// the real values, not a client reference.

export const INTRO_STORAGE_KEY = "licitot-intro"

/**
 * Runs before the page paints (inline in the site layout): on the first visit, marks <html>
 * with data-intro, which shows the curtain overlay at once and locks scrolling (globals.css).
 * Skipped for reduced motion, browsers without WebGL 2 and automated browsers (tests, crawlers).
 */
export const INTRO_BOOT_SCRIPT = `try{if(!localStorage.getItem("${INTRO_STORAGE_KEY}")&&!navigator.webdriver&&window.WebGL2RenderingContext&&!matchMedia("(prefers-reduced-motion: reduce)").matches)document.documentElement.setAttribute("data-intro","")}catch(e){}`
