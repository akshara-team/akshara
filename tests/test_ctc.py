import itertools

import numpy as np

from akshara.evidence.ctc import forward, greedy, log_softmax, viterbi

BLANK = 0


def emissions(path: list[int], vocab: int = 4, sharp: float = 6.0) -> np.ndarray:
    """Frames that strongly favour the given token per frame."""
    logits = np.zeros((len(path), vocab))
    logits[np.arange(len(path)), path] = sharp
    return log_softmax(logits)


def brute_force(logp: np.ndarray, tokens: list[int]) -> float:
    """Sum over every frame labelling that collapses to `tokens`."""
    total = -np.inf
    for path in itertools.product(range(logp.shape[1]), repeat=len(logp)):
        out, last = [], BLANK
        for p in path:
            if p != last and p != BLANK:
                out.append(p)
            last = p
        if out == tokens:
            total = np.logaddexp(total, sum(logp[t, p] for t, p in enumerate(path)))
    return float(total)


def test_forward_matches_brute_force():
    rng = np.random.default_rng(0)
    logp = log_softmax(rng.normal(size=(5, 3)))
    for tokens in ([1], [1, 2], [1, 1], [2, 1, 2]):
        assert np.isclose(forward(logp, tokens, BLANK), brute_force(logp, tokens))


def test_too_few_frames_cannot_fit():
    logp = emissions([1, 1])
    assert forward(logp, [1, 1, 1], BLANK) == -np.inf  # three letters need at least 5 frames
    assert viterbi(logp, [1, 1, 1], BLANK).score == -np.inf


def test_viterbi_finds_the_frames_of_each_token():
    logp = emissions([0, 1, 1, 0, 0, 2, 2, 2, 0])
    a = viterbi(logp, [1, 2], BLANK)
    assert a.spans == [(1, 3), (5, 8)]
    assert a.score <= forward(logp, [1, 2], BLANK)  # one path is never more than all paths


def test_the_right_sequence_beats_a_close_wrong_one():
    logp = emissions([0, 1, 0, 2, 0, 3, 0])
    right = viterbi(logp, [1, 2, 3], BLANK).score
    wrong = viterbi(logp, [1, 1, 3], BLANK).score
    assert right > wrong


def test_greedy_reads_without_the_text_and_bounds_every_path():
    logp = emissions([0, 1, 1, 0, 1, 2, 2, 0])
    tokens, best = greedy(logp, BLANK)
    assert tokens == [1, 1, 2]
    assert best >= viterbi(logp, tokens, BLANK).score - 1e-9


def test_viterbi_handles_long_sequences():
    # more than 127 CTC states: the backtrace must not overflow its small integer type
    tokens = [1 + (i % 3) for i in range(100)]
    path = [t for tok in tokens for t in (BLANK, tok)] + [BLANK]
    a = viterbi(emissions(path), tokens, BLANK)
    assert len(a.spans) == 100
    assert a.spans[-1] == (199, 200)
