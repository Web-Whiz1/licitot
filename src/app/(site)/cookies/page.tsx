import type { Metadata } from "next"
import { LegalDocument, legalTitle } from "@/features/legal/legal-document"

export async function generateMetadata(): Promise<Metadata> {
  return legalTitle("cookies")
}

export default function CookiesPage() {
  return <LegalDocument doc="cookies" />
}
