import math

from akshara.dataset import Clip
from akshara.evidence.scoring import edit_distance, heard_as_said, labels, threshold_at


def test_threshold_keeps_false_flags_at_or_under_the_target():
    ok = [float(x) for x in range(100)]  # 0 .. 99
    t = threshold_at(ok, 0.05)
    assert sum(s < t for s in ok) == 5
    assert threshold_at(ok, 0.0) == 0.0  # flags nothing below the lowest ok score
    assert sum(s < threshold_at(ok, 0.0) for s in ok) == 0


def test_threshold_with_ties_never_exceeds_the_target():
    ok = [0.0] * 10 + [1.0] * 10
    t = threshold_at(ok, 0.3)
    assert sum(s < t for s in ok) <= 6


def test_threshold_edge_cases():
    assert threshold_at([], 0.05) == -math.inf
    assert threshold_at([1.0, 2.0], 1.0) == math.inf


def test_labels_split_mistakes_from_fluency_events():
    clip = Clip(
        "c",
        "p",
        "hi-IN",
        "a b c d",
        "a b c d",
        [
            {"index": 1, "type": "near"},
            {"index": 2, "type": "hesitation"},
            {"index": 3, "type": "skip"},
        ],
        "timbre-v3.0",
        None,
        None,
    )
    mistakes, fluency = labels(clip)
    assert mistakes == {1: "near", 3: "skip"}
    assert fluency == {2: "hesitation"}


def test_heard_as_said():
    assert edit_distance("कमल", "खमल") == 1
    assert heard_as_said("खमल", "कमल", "खमल")
    assert not heard_as_said("कमल", "कमल", "खमल")
    assert not heard_as_said("गमल", "कमल", "खमल")  # equally far from both: not counted
