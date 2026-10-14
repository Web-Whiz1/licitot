import type { Metadata } from "next"
import { LegalDocument, legalTitle } from "@/features/legal/legal-document"

export async function generateMetadata(): Promise<Metadata> {
  return legalTitle("terms")
}

export default function TermsPage() {
  return <LegalDocument doc="terms" />
}
