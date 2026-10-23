# Fonts

Newsreader and Public Sans are licensed under the [SIL Open Font License 1.1](https://openfontlicense.org).

| File                                                         | What                                                     | Used by                          |
| ------------------------------------------------------------ | -------------------------------------------------------- | -------------------------------- |
| `Newsreader-Variable.woff2`                                  | [Newsreader](https://fonts.google.com/specimen/Newsreader), wght 400–700, opsz pinned at 36 | Web: headings, wordmark          |
| `Newsreader-Italic.woff2`                                    | Newsreader Italic 500, opsz 36                           | Web: emphasis in headlines (lazy) |
| `PublicSans-Variable.woff2`                                  | [Public Sans](https://fonts.google.com/specimen/Public+Sans), wght 400–800 | Web: all other text, prices      |
| `public/fonts/PublicSans-Variable.woff2`                     | Same file, public URL                                    | Stripe embedded components       |
| `public/fonts/Newsreader-SemiBold-OG.otf`, `PublicSans-*-OG.otf` | Static 600 / 700 / 500 instances, without GSUB       | OG images (Satori)               |

All files come from the Google Fonts API, subset with its `text` parameter to Basic Latin,
Latin-1, Latin Extended-A, ș ț (comma-below, U+0218–U+021B) and the punctuation the UI uses
(– — ‘ ’ “ ” „ • … € → ← ↔ ≤ ≥ × − ·, thin and narrow no-break spaces), so one request per file
covers every Romanian page. The comma-below glyphs were verified in every file with opentype.js.
Pinning Newsreader's optical size at 36 halves the file (78 KB instead of 171 KB).

Satori (OG images) needs static, non-woff2 files and can mis-measure substituted glyphs, so the
OG files are static TrueType instances (requested with a legacy user agent) re-saved with
opentype.js after deleting the GSUB table. The logo wordmark outlines in
`src/lib/brand/wordmark.ts` were made from the same Newsreader SemiBold instance. To add
characters, extend the text list and regenerate.
