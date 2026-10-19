# Fonts

Both families are licensed under the [SIL Open Font License 1.1](https://openfontlicense.org).

| File                            | Family                                                                               | Used by                  |
| ------------------------------- | ------------------------------------------------------------------------------------ | ------------------------ |
| `Geist-Variable.woff2`          | [Geist](https://vercel.com/font) (wght 100–900)                                      | Web: UI text, numbers    |
| `Fraunces-Display.woff2`        | [Fraunces](https://fonts.google.com/specimen/Fraunces) SemiBold, SOFT 50, opsz 9–144 | Web: headings            |
| `Fraunces-SemiBold-Display.ttf` | Fraunces static 600, SOFT 50, opsz 144                                               | OG images, logo outlines |

All files come from the Google Fonts API, subset with its `text` parameter to Basic Latin,
Latin-1, Latin Extended-A, ș ț (comma-below, U+0218–U+021B) and the punctuation the UI uses
(– — „ ” … € → ↔ ≤ ≥, narrow no-break space). Satori needs a static TrueType file, so the OG
font is requested with a legacy user agent. OG images use Fraunces only (Satori mis-spaces
Geist). To add characters, extend the text list and download the files again.
