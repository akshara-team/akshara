from akshara.core.align import score
from akshara.core.plant import half_word, near_candidates, plant

HI = "मीना रोज़ सुबह स्कूल जाती है। वह अपने दोस्तों के साथ खेलती है।"
POOL = ["किताब", "पानी", "बादल", "सुबह", "चिड़िया", "मछली"]


def test_near_changes_one_akshara_and_is_not_a_spelling_variant():
    for c in near_candidates("दूध", "hi-IN"):
        assert c != "दूध" and len(c) == len("दूध")
    assert near_candidates("पानी", "hi-IN")


def test_tables_exist_for_each_language():
    assert near_candidates("ಹಾಲು", "kn-IN")
    assert near_candidates("மலை", "ta-IN")


def test_half_word_never_ends_on_a_dangling_mark():
    h = half_word("दोस्तों")
    assert h and h != "दोस्तों"
    assert half_word("कि") is None


def test_plant_is_deterministic_and_scores_as_planted():
    a = plant("x", "hi-IN", HI, ["skip", "near"], POOL, seed=1)
    b = plant("x", "hi-IN", HI, ["skip", "near"], POOL, seed=1)
    assert a == b and a is not None
    planted = {e["index"] for e in a["errors"]}
    s = score(HI, a["read_as"], loose=True)
    assert set(s.flagged_indexes) == planted


def test_each_kind_is_recorded():
    p = plant("y", "hi-IN", HI, ["distant", "half"], POOL, seed=2)
    assert p is not None
    assert [e["type"] for e in p["errors"]] in (["distant", "half"], ["half", "distant"])


def test_errors_are_never_adjacent():
    for seed in range(20):
        p = plant("z", "hi-IN", HI, ["skip", "near", "half"], POOL, seed=seed)
        if p:
            idx = [e["index"] for e in p["errors"]]
            assert all(abs(a - b) >= 2 for a in idx for b in idx if a != b)


def test_unplaceable_returns_none():
    assert plant("w", "hi-IN", "राम", ["skip", "near"], POOL) is None


def test_repeat_and_selfcorrect_keep_the_story_words_in_order():
    from akshara.core.align import insertion_near

    for kind in ("repeat", "selfcorrect"):
        p = plant("d", "hi-IN", HI, [kind], POOL, seed=3)
        assert p is not None
        i = p["errors"][0]["index"]
        s = score(HI, p["read_as"], loose=True)
        assert s.flagged_indexes == []  # every story word was still read
        assert insertion_near(s.marks, i)


def test_insertion_near_is_false_for_a_clean_reading():
    from akshara.core.align import insertion_near

    assert not insertion_near(score(HI, HI, loose=True).marks, 2)
