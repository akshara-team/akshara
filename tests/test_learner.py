import numpy as np

from akshara.core.difficulty import FEATURES, profiles
from akshara.core.stats import auc
from akshara.learner.bkt import Learner, Params, update
from akshara.learner.placement import Placement, passes
from akshara.learner.simulate import PERFECT, Child, Pools, make_child, place, true_level
from akshara.learner.skills import STAGES, build, length_band

HI = [
    "कमल का घर बड़ा है। राम का घर छोटा है।",
    "सीता स्कूल जाती है और किताब पढ़ती है।",
    "बच्चे खेल रहे हैं। मोर नाच रहा है।",
]


def test_curriculum_orders_stages_and_covers_every_word():
    cur = build(HI, "hi-IN")
    stages = [s.stage for s in cur.skills]
    assert stages == sorted(stages, key=STAGES.index)  # stages never interleave
    for text in HI:
        for w in text.replace("।", " ").split():
            skills = cur.skills_of(w)
            assert skills and skills[-1].startswith("length:")
            assert [cur.position(s) for s in skills] == sorted(cur.position(s) for s in skills)


def test_skills_of_a_word():
    cur = build(HI, "hi-IN")
    s = cur.skills_of("स्कूल")
    assert "letter:स" in s and "letter:क" in s and "sign:ू" in s
    assert any(x.startswith("conjunct:") for x in s)
    assert length_band(2) == "short" and length_band(4) == "medium" and length_band(5) == "long"


def test_tamil_pulli_is_a_skill():
    cur = build(["பள்ளிக்கு போ"], "ta-IN")
    assert "sign:்" in cur.skills_of("பள்ளிக்கு")


def test_bkt_moves_the_right_way_and_unsure_is_weaker():
    p = Params()
    assert update(0.3, True, p) > 0.3
    assert update(0.3, False, p, weight=1.0) < update(0.3, False, p, weight=0.3)
    a, b, c = Learner(), Learner(), Learner()
    for _ in range(5):
        a.observe(["x"], "correct")
        b.observe(["x"], "unsure")
        c.observe(["x"], "error")
    assert a.p("x") > b.p("x") > c.p("x")


def test_teacher_override_counts_more():
    a, b = Learner(), Learner()
    a.observe(["x"], "error")
    b.observe(["x"], "error", teacher=True)
    assert b.p("x") < a.p("x")


def test_blame_falls_on_the_doubtful_skill():
    lr = Learner(mastery={"solid": 0.97, "shaky": 0.3})
    lr.observe(["solid", "shaky"], "error")
    assert 0.97 - lr.p("solid") < 0.3 - lr.p("shaky")
    assert lr.p("solid") > 0.9


def test_placement_follows_the_aser_tree():
    pl = Placement()
    pl.record(["correct"] * 20)  # paragraph passed
    assert pl.task == "story"
    pl.record(["correct"] * 10 + ["error"] * 10)
    assert pl.level == "paragraph" and pl.items == 2

    pl = Placement()
    pl.record(["error"] * 20)  # paragraph failed
    pl.record(["correct"] * 5)  # words passed
    assert pl.level == "word"


def test_unsure_gets_one_more_item_then_half():
    pl = Placement()
    pl.record(["correct"] * 15 + ["unsure"] * 5)  # 75%..100%: open
    assert pl.task == "paragraph" and not pl.done
    pl.record(["correct"] * 15 + ["unsure"] * 5)  # still open: half rule, 87.5% passes
    assert pl.task == "story" and pl.uncertain
    assert passes(["correct"] * 4 + ["error"], "words", 0.0)


def test_difficulty_is_centred_and_harder_text_scores_higher():
    texts = ["राम घर जा।", "कमल का घर है।", "विद्यालय में क्षात्र प्रतिस्पर्धा करते हैं।"]
    ps = profiles(texts, "hi-IN")
    assert set(ps[0].features) == set(FEATURES)
    assert abs(sum(p.score for p in ps)) < 1e-9
    assert ps[2].score > ps[0].score


def test_simulated_child_and_perfect_placement():
    cur = build(HI, "hi-IN")
    rng = np.random.default_rng(0)
    everyone = Child({s.id for s in cur.skills})
    nobody = Child(set())
    letters = [[[s.id]] * 5 for s in cur.skills if s.kind == "letter"][:3]
    para = [[cur.skills_of(w) for w in t.replace("।", " ").split()] for t in HI]
    pools = Pools({"letters": letters, "words": para, "paragraph": para, "story": para})
    assert true_level(everyone, pools) == "story"
    assert true_level(nobody, pools) == "beginner"
    assert place(nobody, pools, PERFECT, rng).level == "beginner"
    child = make_child(cur, 5, rng)
    assert child.known <= {s.id for s in cur.skills}


def test_auc():
    assert auc([2.0, 3.0], [0.0, 1.0]) == 1.0
    assert auc([1.0], [1.0]) == 0.5
    assert auc([], [1.0]) is None
