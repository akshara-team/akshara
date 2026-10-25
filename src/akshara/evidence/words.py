"""Per-word evidence from one CTC acoustic model: where each word is, and how well it fits.

Given the model's frame-by-frame log-probabilities for a clip and the story words:

1. **Align** the whole story to the audio (CTC forced alignment), so every word gets a start
   and end time. Prisma gives no timings; this does.
2. **Check** each word inside its own frames:
   - `margin_alt`: fit of the story word minus the fit of its best likely misreading
     (close sounds, look-alikes, vowel length, vowel signs, conjuncts: `core/confusions.py`)
   - `margin_free`: fit of the story word minus the model's own best free reading of those
     frames (catches misreadings outside the list, at the cost of more noise)
   - `score` is the smaller of the two, per frame. Low or negative: probably misread.
   - the same two margins as plain sums (`*_sum`, log-probability over the word, not per
     frame), so a one-letter change in a long word is not diluted by the word's length, and
     `free_edits`, how many letters the free reading changes
3. **Time** each word (for pauses and sounding out): the gap before it, and how much of that
   gap holds speech rather than silence.

Pure numpy given the emissions; the model itself lives in `evidence/mms.py`.
"""

from dataclasses import asdict, dataclass

import numpy as np

from akshara.core.confusions import confusions
from akshara.evidence.ctc import greedy, viterbi

PAD_FRAMES = 2  # frames added on each side of a word's span before checking it


@dataclass
class Emissions:
    logp: np.ndarray  # (frames, vocab) natural-log probabilities
    frame_s: float
    vocab: dict[str, int]  # token text -> id
    blank: int
    sep: int | None  # word separator token, if the model has one

    def encode(self, text: str) -> list[int]:
        """Token ids for the letters of `text`; letters the model does not know are dropped."""
        return [self.vocab[c] for c in text if c in self.vocab]

    def decode(self, ids: list[int]) -> str:
        inv = {i: t for t, i in self.vocab.items()}
        return "".join(" " if i == self.sep else inv.get(i, "") for i in ids).strip()


@dataclass
class WordEvidence:
    index: int
    word: str
    start_s: float
    end_s: float
    gap_before_s: float  # time between the previous word's end and this word's start
    gap_speech_s: float  # of that gap, time where the model hears letters (sounding out, extra
    #                      speech), as opposed to silence (a plain pause)
    free_text: str  # what the model reads in these frames on its own
    margin_free: float
    best_alt: str | None
    alt_how: str | None
    margin_alt: float | None  # None when the word has no listed misreadings
    score: float
    dropped_letters: int  # letters of the word the model has no token for
    frames: int = 0  # frames in the checked segment
    margin_free_sum: float = 0.0
    margin_alt_sum: float | None = None
    free_edits: int = 0  # letter edits between the free reading and the story word

    def to_json(self) -> dict:
        d = asdict(self)
        for k in (
            "start_s",
            "end_s",
            "gap_before_s",
            "gap_speech_s",
            "margin_free",
            "margin_alt",
            "score",
            "margin_free_sum",
            "margin_alt_sum",
        ):
            if isinstance(d[k], float):
                d[k] = round(d[k], 4)
        return d


def _edits(a: list[int], b: list[int]) -> int:
    prev = list(range(len(b) + 1))
    for i, x in enumerate(a, 1):
        cur = [i]
        for j, y in enumerate(b, 1):
            cur.append(min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + (x != y)))
        prev = cur
    return prev[-1]


def transcript(em: Emissions) -> str:
    """The model's free reading of the whole clip, as text."""
    ids, _ = greedy(em.logp, em.blank)
    return " ".join(em.decode(ids).split())


def _no_separator(em: Emissions) -> np.ndarray:
    """Frame log-probabilities with the word separator folded into blank.

    The model writes its separator over pauses, including the silence at the start and end of
    a clip. For alignment a separator only means "no letter here", so it counts as blank.
    Requiring it as a token instead forces the last word to stretch over the trailing silence.
    """
    if em.sep is None:
        return em.logp
    lp = em.logp.copy()
    lp[:, em.blank] = np.logaddexp(lp[:, em.blank], lp[:, em.sep])
    lp[:, em.sep] = -np.inf
    return lp


def check(em: Emissions, words: list[str], lang: str) -> list[WordEvidence] | None:
    """Evidence for every story word, or None if the story cannot be aligned to the audio."""
    lp = _no_separator(em)
    tokens: list[int] = []
    owner: list[int] = []  # story word index per token
    for i, w in enumerate(words):
        ids = em.encode(w)
        tokens += ids
        owner += [i] * len(ids)
    a = viterbi(lp, tokens, em.blank)
    if a.score == -np.inf:
        return None
    spans: dict[int, tuple[int, int]] = {}
    for (start, end), i in zip(a.spans, owner, strict=True):
        s0, e0 = spans.get(i, (start, end))
        spans[i] = (min(s0, start), max(e0, end))

    out = []
    prev_end = 0
    n = len(lp)
    heard = em.logp.argmax(axis=1)
    speech = (heard != em.blank) & (heard != (em.sep if em.sep is not None else -1))
    for i, w in enumerate(words):
        if i not in spans:
            continue  # no letter of this word is known to the model
        start, end = spans[i]
        seg = lp[max(0, start - PAD_FRAMES) : min(n, end + PAD_FRAMES)]
        ids = em.encode(w)
        fit = viterbi(seg, ids, em.blank).score
        free_ids, free_fit = greedy(seg, em.blank)
        frames = len(seg)
        margin_free = (fit - free_fit) / frames
        best_alt, how, best_fit = None, None, -np.inf
        for alt, detail in confusions(w, lang).items():
            alt_ids = em.encode(alt)
            if alt_ids == ids:
                continue  # the model cannot tell these apart in writing
            s = viterbi(seg, alt_ids, em.blank).score
            if s > best_fit:
                best_alt, how, best_fit = alt, detail, s
        margin_alt = None if best_alt is None else (fit - best_fit) / frames
        score = margin_free if margin_alt is None else min(margin_free, margin_alt)
        out.append(
            WordEvidence(
                index=i,
                word=w,
                start_s=start * em.frame_s,
                end_s=end * em.frame_s,
                gap_before_s=max(0, start - prev_end) * em.frame_s,
                gap_speech_s=float(speech[prev_end:start].sum()) * em.frame_s,
                free_text=em.decode([t for t in free_ids if t != em.sep]),
                margin_free=margin_free,
                best_alt=best_alt,
                alt_how=how,
                margin_alt=margin_alt,
                score=score,
                dropped_letters=len(w) - len(ids),
                frames=frames,
                margin_free_sum=fit - free_fit,
                margin_alt_sum=None if best_alt is None else fit - best_fit,
                free_edits=_edits([t for t in free_ids if t != em.sep], ids),
            )
        )
        prev_end = end
    return out
