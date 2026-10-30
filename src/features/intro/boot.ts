// Shared by the site layout (server) and the intro (client): plain module, so the server gets
// the real values, not a client reference.

/**
 * Runs before the page paints (inline in the site layout): on every full load of the home page
 * (arriving on the site or refreshing it), marks <html> with data-intro, which shows the curtain
 * overlay at once and locks scrolling (globals.css). Navigating inside the site never replays it.
 * Skipped on other pages, for reduced motion, without WebGL 2 and in automated browsers (tests,
 * crawlers).
 */
export const INTRO_BOOT_SCRIPT = `try{if(location.pathname==="/"&&!navigator.webdriver&&window.WebGL2RenderingContext&&!matchMedia("(prefers-reduced-motion: reduce)").matches)document.documentElement.setAttribute("data-intro","")}catch(e){}`
