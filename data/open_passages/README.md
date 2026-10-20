# Open passages

Source: the public catalogue of [StoryWeaver](https://storyweaver.org.in) (Pratham Books and other publishers). Story text needs a login, so each passage is the book's published **description** (2–3 sentences, written by people), with its reading level, publisher and URL in `sources.jsonl`.

- StoryWeaver states that its books are licensed CC BY 4.0. We have not checked the licence book by book; each row says so.
- Descriptions are blurbs, not story text. We drop ones that talk about the book itself (for example "read the story"). Some remain, so these passages test reading mistakes, not reading level.
- No passage has been reviewed by a native speaker.
- `raw/` holds the cached catalogue responses; `candidates.jsonl` is the filtered list; `passages.jsonl` has the planted mistakes (`scripts/build_open_passages.py`, fixed seed).
- Audio is synthetic and git-ignored.
