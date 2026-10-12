import {
  Bike,
  BookOpen,
  Car,
  Gem,
  Home,
  Laptop,
  Shirt,
  Tag,
  ToyBrick,
  type LucideIcon,
} from "lucide-react"

// categories.icon (set in the foundation migration) → lucide icon.
const ICONS: Record<string, LucideIcon> = {
  laptop: Laptop,
  car: Car,
  home: Home,
  shirt: Shirt,
  bike: Bike,
  gem: Gem,
  "toy-brick": ToyBrick,
  "book-open": BookOpen,
}

export function CategoryIcon({ name, className }: { name: string | null; className?: string }) {
  const Icon = (name && ICONS[name]) || Tag
  return <Icon aria-hidden className={className} />
}
