import { getRequestConfig } from "next-intl/server"
import { APP_TIME_ZONE } from "@/lib/dates"

// Single locale for now ("without i18n routing"). To add English later, introduce
// [locale] routing and load messages/<locale>.json here.
export const DEFAULT_LOCALE = "ro"

export default getRequestConfig(async () => ({
  locale: DEFAULT_LOCALE,
  timeZone: APP_TIME_ZONE,
  messages: (await import(`../../messages/${DEFAULT_LOCALE}.json`)).default,
}))
