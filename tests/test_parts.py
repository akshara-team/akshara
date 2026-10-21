import json
from pathlib import Path

import pytest

from akshara.core.parts import HARD_MAX_WORDS, TARGET_WORDS, split_parts
from akshara.core.text import words

OPEN = Path(__file__).resolve().parent.parent / "data" / "open_passages" / "passages.jsonl"


def test_short_passage_is_one_part():
    assert split_parts("राम स्कूल जाता है।") == ["राम स्कूल जाता है।"]


def test_sentences_pack_up_to_the_target():
    s = "एक दो तीन चार। पाँच छह सात आठ। नौ दस ग्यारह बारह।"
    assert split_parts(s, target=8) == ["एक दो तीन चार। पाँच छह सात आठ।", "नौ दस ग्यारह बारह।"]


def test_a_sentence_is_not_cut_below_the_hard_max():
    s = " ".join(["ಪದ"] * 15) + "."
    assert split_parts(s, target=12, hard_max=20) == [s]


def test_a_very_long_sentence_is_cut_evenly():
    s = " ".join(f"w{i}" for i in range(25))
    parts = split_parts(s, target=12, hard_max=20)
    assert [len(p.split()) for p in parts] == [9, 9, 7]


def test_closing_quote_after_full_stop_ends_a_sentence():
    s = 'அவள் சொன்னாள் "வா வா." என்றாள் சரி நல்லது போ.'
    assert split_parts(s, target=4) == ['அவள் சொன்னாள் "வா வா."', "என்றாள் சரி நல்லது போ."]


def test_bad_limits_are_rejected():
    with pytest.raises(ValueError):
        split_parts("a b", target=5, hard_max=3)


@pytest.mark.skipif(not OPEN.exists(), reason="open passages not present")
def test_every_open_passage_round_trips_and_fits():
    for line in OPEN.read_text(encoding="utf-8").splitlines():
        ref = json.loads(line)["reference"]
        parts = split_parts(ref)
        assert words(" ".join(parts)) == words(ref)  # nothing lost, nothing added
        assert all(len(p.split()) <= max(TARGET_WORDS, HARD_MAX_WORDS) for p in parts)


def test_a_tiny_last_question_joins_the_part_before():
    s = " ".join(["ಪದ"] * 10) + ". ಏಕೆ?"
    assert split_parts(s, target=10, hard_max=20) == [s]


def test_a_tiny_part_stays_alone_if_joining_would_pass_the_hard_max():
    long = " ".join(["ಪದ"] * 20) + "."  # 20 + 1 would pass the hard max
    assert split_parts(long + " ಏಕೆ?", target=12, hard_max=20) == [long, "ಏಕೆ?"]
