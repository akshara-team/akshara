# Daniel: your part, in one place

*Written 2026-10-28. Everything you need is in this file. The full plan is
[FINISH_PLAN.md](FINISH_PLAN.md) if you want the context.*

**We're entering as a pair** (the Two-Person Army award included). Interviews are one to one,
so be ready to explain the parts you built: the web app, the API contract, the frontend stack
choice, and the Kannada and Tamil text.

## What Akshara is now

A reading tutor in Kannada, Tamil and Hindi. A teacher adds a child (a nickname, with a parent's
consent) and places them with a short ASER-style test. The child reads a story aloud: Prisma
hears it, each word is marked, missed words are practised akshara by akshara with Timbre, and a
short practice sentence (written by Evon, approved by a teacher) uses the sound they find hard.
The teacher sees the class and listens to the marks worth checking. Every child screen is in the
child's language with a speaker button that reads the instruction aloud.

**Dates:** the demo video is recorded Nov 1, the post goes up Nov 2–3, we submit by Nov 9. Your
review tasks (D1, D6) matter most: a demo with awkward Kannada or Tamil would hurt more than any
missing feature.

## Run it (no API key, no credits)

```bash
git clone https://github.com/akshara-team/akshara && cd akshara
cd web && npm install && npm run dev      # http://localhost:5173, mock mode
```

Mock mode needs no backend. As a child: pick the language → **I am reading** → choose a name →
**Read a story** → tap **demo reading** instead of the microphone. As a teacher: **I am a
teacher**. To start over, open `/switch`.

## Your tasks

| # | Task | Size | By | Kind |
|---|---|---|---|---|
| D1 | Review the Kannada and Tamil child text | 1–1.5 h | Oct 30 | native review |
| D2 | FLS 2022 Grade 3 reading bands | 1–2 h | Oct 30 | code, new files only |
| D3 | Stars and reading streak | 1–2 h | Oct 31 | code, new files only |
| D6 | Approve or reject Evon's Kannada and Tamil practice sentences | 30 min | Oct 31 | native review, in the app |
| D4 | Test pass on your phone in Kannada and Tamil | 1 h | Nov 1 | testing |
| D5 | *Optional, after Nov 3:* held-out clips and script reviews | — | if time | — |

If time is short, do D1 and D6 first, then D4. D2 and D3 are nice for the demo but not needed.

### D1. Review the Kannada and Tamil child text

`web/src/i18n/kn.json` and `web/src/i18n/ta.json` hold every word a child sees or hears. They
are first drafts by Claude and nobody has checked them. How to review is in
[web/src/i18n/REVIEW.md](../web/src/i18n/REVIEW.md): the reader is 6–8 years old, short warm
everyday words, the familiar "you" (ನೀನು / நீ), keep every `{placeholder}`, no English letters.

Look closely at the newest lines:

- The instruction beside a speaker button: spoken aloud by Timbre, so **keep each under 60
  characters** (a test fails otherwise) and make it sound natural when heard, not read.
- `sentence.*`, `check.saved*`, `home.waiting`, `read.noise*`, `feedback.noisy`: practice
  sentences, readings saved offline, the noise check.

Read every child screen in mock mode while you edit. Check: `cd web && npm test -- i18n spoken`.
Then mark both files reviewed in `REVIEW.md`. Branch `feat/i18n-kn-ta`.

### D2. FLS 2022 Grade 3 reading bands (new files only)

The numbers are the Foundational Learning Study (FLS) 2022 **Grade 3** oral-reading benchmarks.
FLS assessed Grade 3 only, so there is no Grade 2 band.

`web/src/lib/nipun.ts` exports

```ts
nipunBand(lang: "kn-IN" | "ta-IN" | "hi-IN", grade: number, wcpm: number):
  { level: "below" | "partially" | "meets" | "exceeds";
    min: number; max: number | null; goal: { low: number; high: number } } | null
```

(null when the grade has no band — only Grade 3 does). The bands come from each language's
**"Benchmark of ORF with Comprehension and Student Performance"** table in the FLS 2022 national
report (correct words a minute, its four Global Proficiency levels); cite the page in a comment:

| Language | Below | Partially meets | Meets (the goal) | Exceeds | Page |
|---|---|---|---|---|---|
| Hindi | 0–16 | 17–34 | **35–54** | 55+ | 29 |
| Kannada | 0–13 | 14–29 | **30–48** | 49+ | 32 |
| Tamil | 0–8 | 9–27 | **28–49** | 50+ | 62 |

`web/src/components/BenchmarkBand.tsx` shows the child's number against that goal
("End-of-Grade-3 goal") — a position, not a pass/fail pill — readable without colour. Unit tests
for every language, the four cut-offs rising, and the edges. Branch `feat/nipun-bands`. Claude
wires it into the dashboard and profile.

### D3. Stars and reading streak (new files only)

`web/src/state/rewards.ts` computes, from the reading history in `web/src/state/storage.ts`
(read only): stars (one per finished story), the current streak of days with a reading, and the
best streak. Pure functions, timezone-safe (a day is the child's local day), tested.
`web/src/components/RewardsStrip.tsx` shows stars and streak for one child, large and friendly.
No leaderboard, no comparing children. Branch `feat/rewards`. Claude wires it into the child home.

### D6. Approve Evon's practice sentences

Once Achindra has run Evon's batch (it writes `data/practice/sentences.jsonl`), open the teacher
view → **Sentences**, pick Kannada, then Tamil. For each sentence: would a Class 2 child in your
school read and understand it? Is it correct, natural and safe? **Approve** or **Reject**. Reject
anything you are unsure of: only approved sentences reach children. Note anything Evon gets
wrong often (a word, a grammar pattern) in a GitHub issue; we will quote how many passed.

### D4. Test pass on your phone

On the finished build (Achindra sends the link around Nov 1), in Kannada and in Tamil: read a
whole story as a child, practise the words, read the sentence, tap every speaker button, then
look at the teacher view. File a GitHub issue for anything wrong, with a screenshot and the phone
and browser.

### D5. Optional, after Nov 3

Render the held-out clips ([HOLDOUT_HOWTO.md](HOLDOUT_HOWTO.md)), and the pending Kannada and
Tamil reviews of the script tables and skill order ([review/](review/)).

## Rules for code (D2, D3)

- Branch from `main`, one PR per task, CI green before merge:
  `cd web && npm run lint && npm run typecheck && npm test && npm run build && npm run budget`.
- **Only create the files named above.** Do not edit existing screens or `web/src/api/*`; Claude
  wires your pieces in, so your branches never conflict with ours.
- No emoji (icons are SVG in `web/src/components/icons.tsx`). Colours and sizes only from
  `web/src/theme/theme.css`. Native text gets `lang` and its font via `scriptClass()`.
- The bundle is close to its budget (112 of 120 kB JS gzip): no new dependencies.
- No real children's voices, names or ID numbers anywhere, including tests.

## Brief for your coding agent (paste as is)

> Akshara repo (`web/` is a Vite + React + TypeScript PWA). Branch from `main`, one PR per task,
> CI green before merge (`cd web && npm run lint && npm run typecheck && npm test && npm run build
> && npm run budget`). Only create the files named below; do not edit existing screens or
> `src/api/*`. No emoji (icons are SVG in `components/icons.tsx`); colours and sizes only from
> `src/theme/theme.css`; native text gets `lang` via `scriptClass()`. No new dependencies.
>
> **D2 `feat/nipun-bands`.** `src/lib/nipun.ts` exports
> `nipunBand(lang: "kn-IN" | "ta-IN" | "hi-IN", grade: number, wcpm: number): { level: "below" | "partially" | "meets" | "exceeds"; min: number; max: number | null; goal: { low: number; high: number } } | null`
> (null when the grade has no band — only Grade 3 does). Use the **FLS 2022 Grade 3** benchmark
> from each language's "Benchmark of ORF with Comprehension and Student Performance" table in the
> national report, citing the page: Hindi 0–16 / 17–34 / 35–54 / 55+ (p. 29), Kannada 0–13 /
> 14–29 / 30–48 / 49+ (p. 32), Tamil 0–8 / 9–27 / 28–49 / 50+ (p. 62). `components/BenchmarkBand.tsx`
> shows the child's number against the Meets goal — a position, not a pass/fail pill, readable
> without colour. Unit tests for every language, the four cut-offs rising, and the edges.
>
> **D3 `feat/rewards`.** `src/state/rewards.ts` computes, from the reading history in
> `src/state/storage.ts` (read only): stars (one per finished story), the current streak of days
> with a reading, and the best streak. Pure functions, timezone-safe, tested.
> `components/RewardsStrip.tsx` shows stars and streak for a child, large and friendly, no
> leaderboard, no comparison with other children.

## Questions

Ask Achindra. If something in the app looks wrong while you review, file an issue rather than
fixing screens yourself.
