# Child-screen text: review

Every child screen takes its text from these files, in the language the child reads in.
`en.json` is the source. `kn.json`, `ta.json` and `hi.json` are **first drafts written by
Claude** and have not been checked by a native speaker yet. Teacher screens stay in English.

| File | Language | Reviewer | State |
|---|---|---|---|
| `kn.json` | Kannada | Daniel | draft, not reviewed |
| `ta.json` | Tamil | Daniel | draft, not reviewed |
| `hi.json` | Hindi | Achindra | draft, not reviewed |

## What to check

- The reader is a 6–8 year old in Class 1–3: short, warm, everyday words. Prefer the word a
  teacher in a government school would say aloud over a formal or Sanskritised one.
- Speak to the child with the familiar "you" (ನೀನು / நீ / तुम), as the drafts do. Change it
  everywhere if a different register sounds more natural to you.
- Keep every `{placeholder}` exactly as it is (`{name}`, `{n}`, `{total}`, `{wcpm}` …). The
  sentence may move it.
- `{language}` is filled with the language's own name (ಕನ್ನಡ, தமிழ், हिंदी), so check that
  the case ending reads right (for example `{language}ದಲ್ಲಿ` becomes ಕನ್ನಡದಲ್ಲಿ).
- Keys starting `feedback.notice` and `results.adults` are for adults reading over the
  child's shoulder; plain and accurate matters more than short there.
- No English words. The test fails on Latin letters, except inside placeholders.

## How

1. Open the app in mock mode (`cd web && npm run dev`), pick the language, read a story with
   "demo reading", and look at every screen: name picker, home, reading, checking, feedback,
   results, and a recovery screen (`/recovery/microphone`, `/recovery/offline`).
2. Edit the JSON file. `npm test -- i18n` checks keys, placeholders and stray English.
3. When a file is done, change its row above to "reviewed" with the date, in the same PR.
