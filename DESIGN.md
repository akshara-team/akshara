---
name: Akshara
description: A picture book that listens. A reading tutor for children learning to read Kannada, Tamil and Hindi.
status: approved direction, 2026-11-02 (blank canvas; the previous frontend and logo are set aside)
colors:
  rice: "#fbfaf6"
  limewash: "#eef3f6"
  slate: "#1f2a2e"
  slate-2: "#2c393e"
  chalk: "#f4f1e8"
  chalk-dim: "#b9c2bf"
  ink: "#1c2140"
  ink-2: "#454a6b"
  ink-muted: "#5c6180"
  peacock: "#0a6e9e"
  peacock-wash: "#dfeef6"
  turmeric: "#f2b01e"
  turmeric-deep: "#7a5300"
  turmeric-wash: "#fdf0cc"
  leaf: "#2f8f46"
  leaf-deep: "#1e6e33"
  leaf-wash: "#e1f2e5"
  laterite: "#c2452d"
  laterite-wash: "#fbe5df"
  register-line: "#c9d3dc"
  register-margin: "#d9534f"
typography:
  display:
    fontFamily: "Baloo 2 / Baloo Tamma 2 / Baloo Thambi 2 (by script)"
    fontSize: "clamp(1.75rem, 1.2rem + 2.4vw, 2.75rem)"
    fontWeight: 800
    lineHeight: 1.1
  reading:
    fontFamily: "Baloo 2 family, by script"
    fontSize: "clamp(2rem, 1.4rem + 3vw, 2.75rem)"
    fontWeight: 500
    lineHeight: 1.65
  slate:
    fontFamily: "Baloo 2 family, by script"
    fontSize: "clamp(3rem, 2rem + 6vw, 5rem)"
    fontWeight: 600
    lineHeight: 1.1
  voice:
    fontFamily: "Baloo 2 family, by script"
    fontSize: "clamp(1.15rem, 0.95rem + 1vw, 1.5rem)"
    fontWeight: 600
    lineHeight: 1.35
  body:
    fontFamily: "Baloo 2, system-ui, sans-serif"
    fontSize: "1rem"
    fontWeight: 400
    lineHeight: 1.5
  label:
    fontFamily: "Baloo 2, system-ui, sans-serif"
    fontSize: "0.875rem"
    fontWeight: 600
    lineHeight: 1.3
rounded:
  sm: "10px"
  md: "16px"
  page: "24px"
  pill: "999px"
spacing:
  xs: "4px"
  sm: "8px"
  md: "16px"
  lg: "24px"
  xl: "32px"
  xxl: "48px"
components:
  action-primary:
    backgroundColor: "{colors.peacock}"
    textColor: "{colors.rice}"
    rounded: "{rounded.pill}"
    height: "76px"
  action-slate:
    backgroundColor: "{colors.turmeric}"
    textColor: "{colors.ink}"
    rounded: "{rounded.pill}"
    height: "76px"
  book-page:
    backgroundColor: "{colors.rice}"
    textColor: "{colors.ink}"
    rounded: "{rounded.page}"
    padding: "24px"
  slate-board:
    backgroundColor: "{colors.slate}"
    textColor: "{colors.chalk}"
    rounded: "{rounded.page}"
    padding: "24px"
  akshara-tile:
    backgroundColor: "{colors.slate-2}"
    textColor: "{colors.chalk}"
    rounded: "{rounded.md}"
    size: "clamp(68px, 14vw, 120px)"
  register-row:
    backgroundColor: "{colors.rice}"
    textColor: "{colors.ink}"
    height: "56px"
---

# Design System: Akshara

> Approved direction (2026-11-02). The previous frontend, including the logo, is set aside; this
> file is the blank-canvas design language every screen is built and checked against.

## Overview

### Creative North Star: "A picture book that listens"

A child holds a picture book. When they read a page aloud, the book listens. When they stumble on
a word, the word lifts off the page onto their slate, letter card by letter card, and is said
slowly until they can read it. When they finish, a kolam appears at the door of their story.
The teacher keeps the class register.

Everything in Akshara comes from four objects every child in Karnataka, Tamil Nadu and the
Hindi belt already knows, so nothing has to be learned:

| Object | What the child knows | What it becomes in Akshara |
|---|---|---|
| **The picture book** (Pratham / StoryWeaver) | Bright illustration on top, a few lines of large text below | The reading screen. Real StoryWeaver page art, credited. |
| **The slate and chalk** | The surface you practise letters on, wipe, try again | The practice screen: a dark slate where a missed word breaks into chalk akshara tiles. |
| **The kolam / rangoli** | A dot grid drawn at the door every morning, line by line | Progress and reward: each reading draws part of a kolam; a finished story completes it. |
| **The varnamala chart** | Every letter with a picture beside it | The akshara as hero: a letter always appears with a picture and a sound. |

The teacher's world is the fifth object: **the class register**, ruled lines with a red margin,
filled in every morning. Teacher screens are calm, factual registers, not dashboards.

### Who and where (from PRODUCT.md)
A child of 6 to 9 in a government school, often unable to read their own script fluently and
unable to read English, holding a shared low-end Android phone or a classroom tablet for five
minutes in a noisy room. A teacher with about 40 children who looks later, with little time.

### Beliefs
1. **Heard and seen before read.** Research with first-time, low-literacy users found text
   interfaces unusable; graphics plus voice, with a consistent help control, worked (Medhi,
   Sagar and Toyama, Microsoft Research India). The child's path has no English and every
   instruction can be heard.
2. **A mistake is a step, never a cross.** The child gets encouragement; the teacher gets the
   plain truth.
3. **The alphabet is the hero.** Aksharas are large, physical, and always paired with a sound.
4. **Real art, honestly credited.** Illustration comes from Indian picture books (StoryWeaver,
   CC BY 4.0). No stock, no AI art, no clip art. Drawn elements are geometry (kolam), never
   imitation illustration.
5. **Built for a cheap phone.** Light pages, offline-first, motion only where it explains.

### Inspirations and research (what each one gave us)
- **StoryWeaver / Pratham Books:** an open library of Indian picture books in many languages,
  illustrated by many artists in many styles, all CC BY. It gives the visual warmth and the
  page layout (art above, large text below). There is no single house style, so Akshara's own
  frame must be quiet and let each book's art lead.
- **Activity-based classrooms (Nali-Kali in Karnataka, ABL in Tamil Nadu):** learning as a
  ladder of small steps with colour-coded cards and milestones. Gives the idea of small steps
  and visible milestones. Karnataka plans to discontinue Nali-Kali from 2026-27, so the design
  borrows the idea, not the programme's identity.
- **BaLA (Building as Learning Aid):** school walls painted with letters and pictures, an
  "alphabet shape board" with objects drawn around each letter. Gives the letter-with-picture
  pairing.
- **Slate and chalk:** the child's practice surface; letters written, wiped, written again.
  Gives a dark, high-contrast practice board and the gesture of "try again".
- **Kolam / rangoli:** daily dot-grid line drawings at the door, studied as mathematics
  (symmetry, repetition, rhythm). Gives a geometric, generative, culturally native system for
  pattern, progress and reward, drawable in code with no artwork.
- **Varnamala / barahkhadi charts:** every letter with a bright picture; the teacher says a
  sound, children find the symbol and write it on a slate. Gives the sound-symbol-picture triad.
- **Google Read Along (Diya):** a buddy who listens, steps in when the child struggles, gives
  stars and badges, works offline. Gives the listening companion and gentle rewards.
- **Khan Academy Kids:** a small cast of characters guiding activities, rewards the child
  collects. Gives the case for a companion (see Open decisions).
- **Reading Buddy (competitor):** live highlighting and an owl companion. Gives the bar for
  liveliness, and what to avoid copying.
- **Ek Type's Baloo:** a multi-script family designed to be both serious and fun, with weight
  and features kept consistent across nine Indic scripts and Latin; its soft, thick stroke
  quiets each script's complex forms. One voice in Kannada, Tamil and Devanagari.
- **Children's UX (Nielsen Norman Group):** touch targets of at least 2 cm by 2 cm for young
  children (about 76 CSS px on a phone); children of 6 to 8 still struggle with scrolling, so
  the action stays in view.

## Colors

The palette comes from the materials: rice-flour white (kolam), the slate, chalk, turmeric,
peacock-blue doors and window frames, leaf green, laterite red earth. Limewash for the wall.

### Primary
- **Peacock** (#0a6e9e): reading. The picture-book screens and their one action.
- **Turmeric** (#f2b01e, deep #7a5300): the slate's chalk accent and practice. Text on it is ink.
- **Leaf** (#2f8f46, deep #1e6e33): "read right", completed kolam lines, finished stories.
- **Laterite** (#c2452d): a skipped word, used sparingly, never as a cross.

### Neutral
- **Rice** (#fbfaf6): the book page.
- **Limewash** (#eef3f6): the wall behind the book.
- **Slate** (#1f2a2e) and **slate 2** (#2c393e): the practice board and its tiles.
- **Chalk** (#f4f1e8, dim #b9c2bf): writing on the slate.
- **Ink** (#1c2140, 2 #454a6b, muted #5c6180): text on paper.
- **Register line** (#c9d3dc) and **register margin** (#d9534f): the teacher's ruled register.

### Named Rules
**The Surface Rule.** Three surfaces only: the book page (rice), the slate (dark), the register
(ruled). A screen is one of them.
**The One Action Colour Rule.** A screen has one action colour: peacock on the book, turmeric on
the slate, ink on the register.
**The Gentle Marks Rule.** Read right: leaf, tick. Read as another word: turmeric, swap. Skipped:
an empty kolam dot in laterite, no cross. Not sure: ink, question mark, sent to the teacher.

## Typography

**Baloo** in every script (Baloo 2 for Latin and Devanagari, Baloo Tamma 2 for Kannada, Baloo
Thambi 2 for Tamil). Noto Sans as fallback.

### Hierarchy
- **Display** (800, clamp 1.75 to 2.75rem): one per screen.
- **Reading** (500, clamp 2 to 2.75rem, line height 1.65): the story text on the page.
- **Slate** (600, clamp 3 to 5rem): aksharas on the slate.
- **Voice** (600, clamp 1.15 to 1.5rem): the spoken line, at most 60 characters (Timbre's limit).
- **Body / Label** (400 / 600): teacher screens and small print.

### Named Rules
**The No English Rule.** The child's path has no English. The teacher's door and screens are
English.
**The Numbers Are The Teacher's Rule.** No speeds or percentages on the child's path; counts of
stars and words are allowed (numbers are fine for low-literacy users, words are not).

## Layout

### Spacing: one scale, fixed jobs
Scale (8 px base, 4 px half step): `4 · 8 · 12 · 16 · 24 · 32 · 48 · 64`. No other values; a check
fails any raw value outside the token file.

| Job | Value |
|---|---|
| Inside a control (icon to label) | 8 |
| Inside a page, slate or register card | 24 phone, 32 tablet; equal on all sides |
| Between items in a group (rows, tiles, chips) | 12 |
| Between groups on a screen | 32 phone, 48 tablet; more above a heading than below it |
| Screen gutter | 16 phone, 32 tablet, plus safe-area insets |
| Bottom action bar | 16 around, 76 tall |

### Breakpoints
Two only: **phone** below 600 px; **tablet** 600 px and up, portrait or landscape. Content is at
most 760 px wide; the teacher register at most 1040 px.

### Child screen frame (every child screen)
```
+ voice control (56) ............... child's mark (40) +   top bar, 64 tall
|                                                      |
|      FOCAL OBJECT (page / slate / kolam / grid)      |   fills the middle; no scrolling on a phone
|                                                      |
+ [          ONE ACTION, 76 tall, full width         ] +   bottom bar, fixed above the safe area
```
- **Phone:** the focal object takes the remaining height; text and tiles scale to fit, so the
  child never scrolls to find the action.
- **Tablet landscape:** the book opens: picture left, text right, action bottom right under the
  text.
- The voice control is top left on every child screen (the consistent help low-literacy users
  need).

### Teacher frame (the register)
Title line with its filters, one status sentence, ruled rows (56 px), one call to action top
right. The red margin line sits 24 px from the left edge of the register.

## Elevation & Depth

Paper and slate, not glass. The book page sits on the wall with one soft shadow; the slate is
flat and dark; the register is flat with ruled lines. No floating card stacks.

### Shadow Vocabulary
- **Page** (`0 1px 2px rgb(28 33 64 / 8%), 0 18px 36px -18px rgb(28 33 64 / 30%)`): the book page
  and the slate on the wall.
- **Press** (`inset 0 -5px 0 rgb(28 33 64 / 22%)`): the one primary action, flattening on press.

## Shapes

Book pages with 24 px corners; slate with 24 px corners and a thin wooden frame line; akshara
tiles 16 px; actions are pills. The kolam provides all decoration: dots and looping lines on a
grid, drawn in rice white on limewash or chalk on slate.

### Consistency rules
| Thing | Rule |
|---|---|
| Surfaces | Exactly three: book page (rice), slate (dark), register (ruled), on the limewash wall. A screen is one of them |
| Corners | Page and slate 24, tiles and child marks 16, controls pill, inner items 10; inner radius = outer radius minus padding |
| Depth | One "page on wall" shadow; one pressed edge on the single primary action. Nothing else lifts; no cards in cards |
| Lines | Register rules and the slate's frame only; no decorative borders |
| Colour | One action colour per surface (peacock on the book, turmeric on the slate, ink on the register); mark colours mean only marks |
| Type | Six roles (display, reading, slate, voice, body, label); one display line per screen; tabular figures for numbers |
| Icons | One line-icon set, 2 px stroke, at 24 and 32 px; picture marks only for identity |
| Touch | Child targets at least 76 px; teacher targets at least 44 px |

**How it stays consistent:** tokens only (a check fails raw values); every screen is assembled
from the same few components (top bar, focal frame, action bar, page, slate, register row) and
does not style itself; a dev-only reference sheet shows every component and state; every screen
is captured at phone, tablet portrait and tablet landscape and compared against the sheet before
review.

## Components

### The picture-book page (reading)
StoryWeaver page illustration on top (credited, CC BY 4.0), the part's text below in reading
type. While the child reads, the page listens (a quiet listening indicator by the voice
control). After reading, each word is marked in place on the page.

### The slate (practice)
A dark board. A missed word arrives in chalk, then splits into akshara tiles, each said in turn
(the tile lights in turmeric), then rejoins into the word; the child reads it; it turns leaf.
Each akshara shows with a picture when the varnamala gives one.

### The kolam (progress and reward)
A dot grid at the door of each story. Each part read draws lines through the dots; the finished
story completes the kolam, which joins the child's row of kolams on their home. Generated in
code from the story (seeded), so every story has its own kolam and no artwork is needed.

### The child's mark (identity)
Each child chooses a picture (bird, cow, boat, tree...) shown as a chalk drawing on a small
slate, so a child who cannot read finds themselves.

### The voice control
A round control, top left on every child screen. Tap: Timbre says the screen's line. While the
app listens, it shows the microphone level.

### The register (teacher)
Ruled rows on rice paper with a red margin line: picture, nickname, the four reading steps
(letter, word, paragraph, story) as ticks, the last reading, and status. Grouping by step is the
Teaching-at-the-Right-Level view. One action: listen to the marks to check.

### The logo
A new mark: the first akshara of the child's script (ಅ / அ / अ), drawn in a single kolam line
around a dot grid, beside the wordmark "Akshara". The script of the mark follows the class's
language.

## Motion

Motion only to explain, give feedback or reward; the more often a child sees something, the less
it moves. Only `transform`, `opacity` and the kolam's stroke drawing are animated. Reduced motion
keeps fades and drops movement.

**Tokens:** `--ease-out: cubic-bezier(0.23, 1, 0.32, 1)` for entries; `--ease-in-out:
cubic-bezier(0.77, 0, 0.175, 1)` for movement on screen. Durations: `--t-press 120ms`,
`--t-ui 200ms`, `--t-explain 450ms`, `--t-reward 900ms`, `--stagger 60ms`.

### Every motion in the app (anything not listed does not move)
| Moment | How often | Purpose | Motion |
|---|---|---|---|
| Press any button or tile | Constant | Feedback | Scale 0.97, 120 ms; the pressed edge flattens |
| Change screen | Dozens a day | Avoid a jump | Opacity only, 120 ms |
| Listening while reading | Every reading | State | The voice control's ring follows the mic level, live |
| Checking the reading | Every reading | Explain the wait | A kolam line draws itself, looping until the result |
| Marks appear on the page | Every reading | Explain the result | Word by word in reading order: fade + 4 px rise, 200 ms, 60 ms apart |
| A word lifts to the slate | A few a day | Spatial | The word moves from its place on the page to the slate, 450 ms ease-in-out |
| Tiles split, are said, rejoin | A few a day | Explain | Split 450 ms; the spoken tile lifts 8 px in turmeric, in time with the voice; rejoin by sliding together |
| Word read right | A few a day | Reward | Tiles turn leaf, one 1.04 pop, 200 ms |
| Kolam completes at the end | Once a story | Reward | Lines draw dot to dot, 900 ms; the star settles in from 0.9 |
| Problems, not found | Rare | none | Instant |
| Teacher screens | Daily | none | Press feedback only; data never moves |

**Banned:** idle loops, bounce outside the end-of-story reward, scale(0) entrances, sliding
screens, parallax, counting-up numbers, motion on teacher data.

**Checking motion:** built with the animate skill; reviewed with `/review-animations` (run by the
user); short screen captures for feel, since stills cannot show motion.

## Do's and Don'ts

### Do:
- **Do** make every child screen one surface, one focal object, one action, one voice line.
- **Do** let StoryWeaver art lead and credit it every time it is shown.
- **Do** draw decoration only with kolam geometry.
- **Do** keep motion to what explains: a word lifting to the slate, tiles splitting and joining,
  kolam lines drawing. Entries ease out with `cubic-bezier(0.23, 1, 0.32, 1)`; UI under 300 ms;
  explanatory moments up to 600 ms; nothing on screens seen dozens of times a day beyond a
  120 ms press; reduced motion keeps fades only.
- **Do** keep touch targets at least 76 px for child actions.

### Don't:
- **Don't** put English, speeds or percentages on the child's path.
- **Don't** use stock illustration, AI art, clip-art icons as decoration, or a mascot drawn from
  shapes that cannot hold up next to real picture-book art.
- **Don't** show a red cross or the word "wrong" to a child.
- **Don't** use cards-in-cards, rows of number boxes, eyebrow labels, gradients or glass.
- **Don't** make a child scroll to find the action.

## Decisions (2026-11-02)

1. **No companion character.** The book and the slate carry the warmth.
2. **Practice happens on a dark slate.**
3. **The kolam is the progress and reward system.** It replaces the ladder graphic; a star count
   stays.
4. **Logo:** the script's first akshara drawn as one kolam line around a dot grid.
5. **Story art:** StoryWeaver page illustrations for the demo stories where they can be fetched,
   credited. The Kannada demo story (ಬಣ್ಣದ ಚಿಟ್ಟೆ, the design's own text) keeps its text and gets
   a generated kolam page instead of a picture.

## As built (2026-11-02)

The screens the demo video shows follow this file: who is reading, home, reading, checking,
marks, practice, finished, and the teacher's class register. Other teacher screens still use
the earlier look.

| Part | Where | Notes |
|---|---|---|
| Tokens | `web/src/theme/theme.css` (first block) | Names from the world: rice, limewash, slate, chalk, ink, peacock, turmeric, leaf, laterite, register. Also `--slate-frame` (#6b5640) for the slate's wooden frame line |
| Frame, voice control, action, book page, slate and tiles, marks, child mark | `web/src/components/Book.tsx`, `book.css` | Every child screen is `ChildFrame`; the frame line is the screen's spoken line, and on reading, marks and practice also its heading |
| Kolam | `web/src/components/Kolam.tsx` | A sikku-style line: a 45° ray bouncing inside the dot grid, each bounce an arc round the edge dot, corners a half circle. Coprime grids (3x4, 4x5, ...) give one closed line. Seeded by story id. Used for the checking loader (loop), the finished story (draws in 900 ms, leaf), the home row and the art fallback |
| Logo | `web/src/components/Logo.tsx` | The script's first akshara set inside one kolam line weaving round a ring of eight dots. The akshara is type, not itself drawn as the line |
| Register | `web/src/screens/teacher/TeacherDashboard.tsx` | Ruled 56 px rows, red margin, grouped by reading step; one status sentence; one call to action (Listen and check). Phone hides accuracy, previous and the step ticks |

Differences from the spec above, and why:
- **Story art:** StoryWeaver page illustrations need a login, so the book's cover is used on
  every page, credited "Picture from <title>".
- **A word lifting from the page to the slate** is not built: practice opens from the finished
  screen, not from the marks.
- **Long words on the slate** (more than five aksharas) wrap in rows of five and do not slide
  together; tiles never get smaller than 52 px.
- **The checking screen** waits at least 1.8 s in demo mode so the kolam is seen.
- **Raw values** remain in `book.css` for small details (dot sizes, stroke widths, the 1.25 rem
  action label, the 0.75 rem credit). The token check is not automated yet.
- **Dark mode** is not defined.

## Sources
- Medhi, Sagar, Toyama, *Text-free user interfaces for illiterate and semi-literate users*,
  ITID 4(1), 2007: https://www.microsoft.com/en-us/research/?p=160568
- Findlater, Balakrishnan, Toyama, audio support for semiliterate users, CHI 2009:
  https://www.dgp.toronto.edu/public_user/ravin/papers/chi2009_literacy.pdf
- Nielsen Norman Group, children's UX and physical development:
  https://www.nngroup.com/articles/children-ux-physical-development/
- Activity-based learning in India: https://en.wikipedia.org/wiki/Activity-based_learning_in_India
- Nali-Kali status (The Federal): https://thefederal.com/category/the-eighth-column/karnataka-government-schools-elementary-school-education-activity-based-learning-joyful-learning-nali-kali-230575
- BaLA (Vikaspedia): https://en.vikaspedia.in/viewcontent/education/education-best-practices/building-as-learning-aid-(bala)
- Kolam: https://en.wikipedia.org/wiki/Kolam and https://www.sahapedia.org/significance-of-kolam-tamil-culture
- Pratham classroom with barahkhadi charts and slates: https://pratham.org/2024/02/23/playing-with-barahkhadi-how-children-spread-warmth-in-a-delhi-classroom-one-december-afternoon/
- StoryWeaver (Pratham Books): https://storyweaver.org.in/prathambooks
- Google Read Along: https://support.google.com/readalong/answer/12279465 and https://techcrunch.com/2020/05/07/google-launches-read-along-a-free-app-that-helps-young-children-practice-reading
- Khan Academy Kids: https://www.khanacademy.org/kids
- Baloo by Ek Type: https://awards.kyoorius.com/2017/design/baloo_4271.html, https://typographica.org/?p=22403, https://github.com/EkType/Baloo
