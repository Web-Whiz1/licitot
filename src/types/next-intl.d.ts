import type messages from "../../messages/ro.json"

// Type-safe message keys: t("nav.sell") is checked at compile time.
declare module "next-intl" {
  interface AppConfig {
    Locale: "ro"
    Messages: typeof messages
  }
}
