import type { NextConfig } from "next"
import createNextIntlPlugin from "next-intl/plugin"

const nextConfig: NextConfig = {
  cacheComponents: true,
  partialPrefetching: true,
  poweredByHeader: false,
  images: {
    // ImageKit does resizing + AVIF/WebP; see src/lib/imagekit-loader.ts.
    loader: "custom",
    loaderFile: "./src/lib/imagekit-loader.ts",
  },
}

const withNextIntl = createNextIntlPlugin("./src/i18n/request.ts")

export default withNextIntl(nextConfig)
