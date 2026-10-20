from akshara.core.align import align, score
from akshara.core.text import normalize, words


def test_normalize_strips_danda_and_punctuation():
    assert normalize("राम घर गया। फिर, सो गया॥") == "राम घर गया फिर सो गया"
    assert words("ರಾಮು ಶಾಲೆಗೆ ಹೋದನು.") == ["ರಾಮು", "ಶಾಲೆಗೆ", "ಹೋದನು"]


def test_normalize_drops_zero_width_joiners():
    assert normalize("क्‍ष") == normalize("क्ष")


def test_perfect_reading():
    s = score("ராமு பள்ளிக்குச் சென்றான்.", "ராமு பள்ளிக்குச் சென்றான்")
    assert s.correct == 3
    assert s.accuracy == 1.0
    assert s.flagged_indexes == []


def test_skip_and_substitution_are_flagged_at_the_right_index():
    ref = "राम सुबह जल्दी उठा और बाग़ में गया"
    said = "राम सुबह जल्दी उठा बाग़ में आया"
    s = score(ref, said)
    assert s.flagged_indexes == [4, 7]
    ops = {m.ref_index: m.op for m in s.marks if m.ref_index is not None}
    assert ops[4] == "skipped"
    assert ops[7] == "substituted"


def test_inserted_words_do_not_flag_story_words():
    s = score("एक दो तीन", "एक एक दो तीन")
    assert s.flagged_indexes == []
    assert [m.op for m in s.marks].count("inserted") == 1


def test_wcpm():
    s = score("a b c d e f", "a b c d e f", duration_s=30)
    assert s.wcpm == 12.0
    assert score("a b", "a b").wcpm is None


def test_empty_transcript_skips_everything():
    marks = align(["a", "b"], [])
    assert [m.op for m in marks] == ["skipped", "skipped"]


def test_loose_treats_spelling_variants_as_equal():
    from akshara.core.text import loose_key

    assert loose_key("रोज़") == loose_key("रोज")
    assert loose_key("गेहूँ") == loose_key("गेहूं")
    assert loose_key("वह") == loose_key("वो")
    assert loose_key("लम्बे") == loose_key("लंबे")
    assert loose_key("गयी") == loose_key("गई")
    assert loose_key("आइये") == loose_key("आइए")
    assert loose_key("கடைக்குச்") == loose_key("கடைக்கு")
    assert loose_key("நமக்குப்") == loose_key("நமக்கு")


def test_loose_keeps_real_differences():
    from akshara.core.text import loose_key

    assert loose_key("ಹೇಳಿದರು") != loose_key("ಹೇಳಿದರೂ")  # Kannada stays strict
    assert loose_key("खेत") != loose_key("खेल")
    assert loose_key("यह") != loose_key("वह")
    assert loose_key("पानी") != loose_key("पाई")
    assert loose_key("சொன்னாள்") != loose_key("சொன்னால்")


def test_score_loose_flag():
    ref = "वह रोज़ स्कूल जाती है"
    heard = "वो रोज स्कूल जाती है"
    assert score(ref, heard).correct == 3
    assert score(ref, heard, loose=True).correct == 5
