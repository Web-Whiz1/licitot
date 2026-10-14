import type { Metadata } from "next"
import { LegalDocument, legalTitle } from "@/features/legal/legal-document"

export async function generateMetadata(): Promise<Metadata> {
  return legalTitle("privacy")
}

export default function PrivacyPage() {
  return <LegalDocument doc="privacy" />
}
