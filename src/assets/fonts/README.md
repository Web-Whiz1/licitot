# Fonts

Geist is licensed under the [SIL Open Font License 1.1](https://openfontlicense.org).

| File                                       | What                                           | Used by            |
| ------------------------------------------ | ---------------------------------------------- | ------------------ |
| `Geist-Variable.woff2`                     | [Geist](https://vercel.com/font), wght 100–900 | Web: all text      |
| `Geist-Bold-OG.otf`, `Geist-Medium-OG.otf` | Geist static 700 / 500, without GSUB           | OG images (Satori) |

All files come from the Google Fonts API, subset with its `text` parameter to Basic Latin,
Latin-1, Latin Extended-A, ș ț (comma-below, U+0218–U+021B) and the punctuation the UI uses
(– — „ ” … € → ↔ ≤ ≥, narrow no-break space), so one request covers every Romanian page.

Satori (OG images) needs static, non-woff2 files and mis-measures words that contain Geist's
contextual substitutions (stray gaps after words with "t"). The OG files are the static
TrueType instances (requested with a legacy user agent) re-saved with opentype.js after
deleting the GSUB table. The logo wordmark outlines in `src/lib/brand/wordmark.ts` were made
from the same Bold instance. To add characters, extend the text list and regenerate.
