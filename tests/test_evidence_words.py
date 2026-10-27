import numpy as np

from akshara.core.confusions import confusions
from akshara.evidence.ctc import log_softmax
from akshara.evidence.words import Emissions, check, transcript

LETTERS = ["<pad>", "|", "क", "ख", "म", "ल", "ा"]
VOCAB = {t: i for i, t in enumerate(LETTERS)}


def emissions(spoken: str, frames_per_letter: int = 3) -> Emissions:
    """Frames that clearly say `spoken` (letters, with "|" between words), blanks between."""
    path = [0]
    for ch in spoken:
        path += [VOCAB[ch]] * frames_per_letter + [0]
    logits = np.full((len(path), len(LETTERS)), 0.0)
    logits[np.arange(len(path)), path] = 8.0
    return Emissions(log_softmax(logits), 0.02, VOCAB, blank=0, sep=1)


def test_confusions_cover_close_sounds_and_skip_spelling_variants():
    alts = confusions("कमल", "hi-IN")
    assert "खमल" in alts and alts["खमल"].startswith("sound: aspiration")
    assert "कमल" not in alts


def test_correct_reading_scores_well_and_is_aligned_in_order():
    em = emissions("कम|लाल")
    ev = check(em, ["कम", "लाल"], "hi-IN")
    assert ev is not None and [e.word for e in ev] == ["कम", "लाल"]
    assert ev[0].end_s <= ev[1].start_s
    assert all(e.score > -0.05 for e in ev)
    assert transcript(em) == "कम लाल"


def test_close_sound_misreading_is_found_and_named():
    em = emissions("खम|लाल")  # the reader aspirated the first letter
    ev = check(em, ["कम", "लाल"], "hi-IN")
    assert ev is not None
    first, second = ev
    assert first.best_alt == "खम" and first.margin_alt < 0 and first.score < 0
    assert first.free_text == "खम"
    assert second.score > first.score


def test_a_pause_shows_up_as_a_gap_before_the_word():
    em = emissions("कम|लाल")
    pause = np.full((25, len(LETTERS)), -20.0)
    pause[:, 0] = 0.0  # 25 blank frames = 0.5 s of silence
    cut = 9  # after the separator
    logp = np.concatenate([em.logp[:cut], pause, em.logp[cut:]])
    ev = check(Emissions(logp, 0.02, VOCAB, 0, 1), ["कम", "लाल"], "hi-IN")
    assert ev is not None and ev[1].gap_before_s >= 0.5


def test_unalignable_audio_returns_none():
    em = emissions("क", frames_per_letter=1)
    assert check(em, ["कमल", "लाल", "कम"], "hi-IN") is None


def test_trailing_separator_frames_do_not_squeeze_the_last_word():
    # the model writes its separator over the silence after the last word
    em = emissions("कम|लाल||||||||||")
    ev = check(em, ["कम", "लाल"], "hi-IN")
    assert ev is not None
    last = ev[-1]
    assert last.end_s < 0.6  # the word ends where it was said, not at the clip's end
    assert last.score > -0.05


def test_sums_are_not_diluted_by_word_length():
    em = emissions("कमलकमलकमलकमल|लाल")
    ev = check(em, ["कमलकमलकमलकमल", "लाल"], "hi-IN")
    assert ev is not None
    w = ev[0]
    assert w.frames > 0
    assert abs(w.margin_free_sum - w.margin_free * w.frames) < 1e-6
    assert w.free_edits == 0
