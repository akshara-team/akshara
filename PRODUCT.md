# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

- **Primary: the child (6–9), in a government-school classroom in Karnataka, Tamil Nadu or a
  Hindi-speaking state.** Still learning to read Kannada, Tamil or Hindi; many cannot yet read the
  app's own instructions. They take turns on one shared device, read a short story aloud, and
  practise the words they missed. Their job: read a bit better today, and want to come back
  tomorrow.
- **Secondary: the teacher.** About 40 children, no time for an hour of one-to-one listening.
  Their job: know which children need help with which sounds, check the marks the system is unsure
  of, and decide.
- The redesign is **child first**: the child flow carries the product; teacher screens must read
  as a credible, calm working tool.
- Also viewing: challenge judges and LinkedIn/X viewers, through a 60-second demo video and a
  public mock-mode demo.

## Product Purpose

Akshara listens to a child read aloud, marks every word right, different or skipped, and helps
straight away with the missed ones, akshara by akshara (each written syllable spoken by Timbre,
then the whole word). It tells the teacher who needs help with what. Success: a child practises
from their own mistakes daily, and a teacher sees the class at a glance without listening to
each child alone.

Context: built for Gnani AI's Great Indian AI Internship Challenge 2026 (submission by Nov 9–10),
by a two-person team.

## Positioning

- **Akshara-by-akshara practice.** A missed word is split into the units of the Indian script and
  practised one syllable at a time. This is the product's name and is specific to Indian scripts.
- **Child and teacher in one loop.** The child reads and practises; the teacher sees the class,
  hears a short clip of a doubtful word and has the final say.
- **Honest about what it cannot hear.** Marks can be "not sure" (sent to the teacher), and a
  reliability page states measured catch rates (a single changed sound is caught 8 of 39 times).
- Kannada, Tamil and Hindi, on all three Gnani models (Prisma hears, Timbre speaks, Evon writes
  practice sentences; Evon's batch is wired in and pending).

## Operating Context

- Device: a **shared classroom Android tablet** is the main channel (PWA, offline-first); it must
  also run on a **2 GB Android phone** on a slow connection. Children switch readers on the same
  device.
- Classrooms are noisy; the app checks noise before recording.
- Reading flow: choose reader → story picked for their level → read part by part → word marks →
  practise missed words → stars and streak.
- Teacher flow: class dashboard (status per child against the FLS 2022 Grade 3 goal) → child
  profile → review queue of doubtful words with clips → approve Evon's practice sentences.
- The demo video and the public GitHub Pages demo run in mock mode (no backend, no credits).

## Capabilities and Constraints

- Built: placement (ASER-style), reading with Prisma, word marks, akshara practice with Timbre,
  learner model (BKT) choosing the next story, stars and streak, teacher dashboard, review queue,
  reliability page, consent and 30-day deletion, offline queue, spoken instructions in the child's
  language.
- Stack: React + TypeScript + Vite PWA in `web/`; all design values in `web/src/theme/theme.css`;
  icons are SVG in `components/icons.tsx` (no emoji). Mock and live modes behind `web/src/api`.
- Child-facing text in Kannada, Tamil and Hindi (`web/src/i18n/`); Kannada and Tamil reviewed by
  a native speaker; every native-script element carries `lang`.
- Bundle budget: 120 kB JS / 160 kB total gzip (CI fails past it).
- Tests (185 web, axe on 22 routes) must stay green.
- Synthetic data only: no real children's voices, names or ID numbers. Children are stored by
  nickname.

## Brand Commitments

- The name **Akshara** is binding. The current logo, the yellow brand colour and the rest of the
  look are free to replace.

## Evidence on Hand

- Reliability study: `docs/RESULTS.md`, `docs/WRITEUP.md` (90 synthetic passages, 4 audio
  conditions; skipped and unrelated words caught almost always; single changed sound 8 of 39).
- FLS 2022 Grade 3 benchmarks per language (AIR national report), in `web/src/lib/nipun.ts`.
- ASER 2024: 23.4% of rural Class 3 children can read a Class 2 text.
- Passages: StoryWeaver catalogue descriptions (CC BY 4.0).
- No real children, teachers, schools, testimonials or pilots exist. Do not invent any.

## Product Principles

1. **The child can use it without reading.** Every action carries a picture and can be spoken.
2. **Help comes from the child's own mistakes**, straight away, one syllable at a time.
3. **The teacher has the final say.** The system flags; a person decides.
4. **Say "not sure" rather than guess.** Never present a mark as more certain than it is.
5. **Encourage, never compare.** Stars and streaks for the child; no leaderboards.

## Accessibility & Inclusion

- Pre-literate children: icons on every child action, spoken instructions, large touch targets.
- Three scripts with conjuncts and vowel signs need generous line height and size.
- Text contrast 4.5:1 (tested); axe checks on every route; marks readable without colour.
