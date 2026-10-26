// The account area's sections, shared by the sidebar/tabs (client) and the overview (server).
import {
  Bell,
  Gavel,
  Hand,
  Heart,
  LayoutDashboard,
  PackageCheck,
  Settings,
  Trophy,
  Wallet,
  type IconComponent,
} from "@/components/icons"

export type TabKey =
  | "overview"
  | "bids"
  | "won"
  | "favorites"
  | "listings"
  | "sold"
  | "payouts"
  | "notifications"
  | "settings"

type Tab = { href: string; key: TabKey; icon: IconComponent }

/** The whole account area, grouped the way people think about it: buying, selling, account. */
export const ACCOUNT_NAV: { group: "buying" | "selling" | "account" | null; tabs: Tab[] }[] = [
  { group: null, tabs: [{ href: "/cont", key: "overview", icon: LayoutDashboard }] },
  {
    group: "buying",
    tabs: [
      { href: "/cont/oferte", key: "bids", icon: Hand },
      { href: "/cont/castigate", key: "won", icon: Trophy },
      { href: "/cont/favorite", key: "favorites", icon: Heart },
    ],
  },
  {
    group: "selling",
    tabs: [
      { href: "/cont/licitatii", key: "listings", icon: Gavel },
      { href: "/cont/vandute", key: "sold", icon: PackageCheck },
      { href: "/cont/incasari", key: "payouts", icon: Wallet },
    ],
  },
  {
    group: "account",
    tabs: [
      { href: "/cont/notificari", key: "notifications", icon: Bell },
      { href: "/cont/setari", key: "settings", icon: Settings },
    ],
  },
]
