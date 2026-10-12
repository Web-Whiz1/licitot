// Tailwind CSS v4 via PostCSS: works with both Turbopack (dev, local builds) and webpack
// (Netlify builds, see netlify.toml).
const config = {
  plugins: {
    "@tailwindcss/postcss": {},
  },
}

export default config
