// Operator details shown on the legal and contact pages. Fictional placeholder operator
// ("LiciTot") until the real company is set up: fill in the registration fields before a
// real launch, and they appear automatically (empty fields are not rendered).
export const OPERATOR = {
  name: "LiciTot",
  email: "contact@licitot.ro",
  /** e.g. "LiciTot SRL" */
  legalName: "",
  /** CUI / CIF */
  taxId: "",
  /** Nr. Registrul Comerțului, e.g. "J12/1234/2026" */
  tradeRegister: "",
  address: "",
} as const

/** Date of the current version of the terms, privacy and cookie policies (ISO). */
export const LEGAL_UPDATED_AT = "2026-10-13"
