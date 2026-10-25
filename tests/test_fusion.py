import numpy as np

from akshara.fusion import (
    FEATURES,
    Thresholds,
    WordInput,
    band,
    choose_thresholds,
    ece,
    features,
    fit_isotonic,
    fit_logistic,
    passage,
    rule_state,
    state,
)


def test_features_have_one_value_per_name():
    w = WordInput("substituted", True, -0.5, -0.2, 1, 4)
    x = features(w)
    assert len(x) == len(FEATURES)
    named = dict(zip(FEATURES, x, strict=True))
    assert named["prisma"] == 1 and named["variant"] == 0
    assert named["prisma_x_alt"] == -0.5


def test_variant_only_when_loose_accepts():
    named = dict(zip(FEATURES, features(WordInput("correct", True, None, 0.0, 0, 3)), strict=True))
    assert named["variant"] == 1 and named["prisma"] == 0 and named["has_alt"] == 0


def test_logistic_learns_a_separable_signal_and_is_deterministic():
    rng = np.random.default_rng(0)
    x = rng.normal(size=(400, 3))
    y = (x[:, 0] - 0.5 * x[:, 1] > 0).astype(int)
    a, b = fit_logistic(x, y), fit_logistic(x, y)
    assert np.array_equal(a.weights, b.weights)
    acc = ((a.score(x) > 0).astype(int) == y).mean()
    assert acc > 0.95
    assert a.weights[0] > 0 > a.weights[1]


def test_isotonic_is_monotone_and_matches_rates():
    s = np.array([0.0, 1.0, 2.0, 3.0, 4.0, 5.0])
    y = np.array([0, 1, 0, 1, 1, 1])
    iso = fit_isotonic(s, y)
    p = iso(np.linspace(-1, 6, 50))
    assert np.all(np.diff(p) >= 0)
    assert iso(np.array([5.0]))[0] == 1.0
    assert abs(iso(np.array([1.5]))[0] - 0.5) < 1e-9  # the pooled block {1, 2}


def test_ece_is_zero_when_calibrated():
    p = np.array([0.0, 0.0, 1.0, 1.0])
    assert ece(p, np.array([0, 0, 1, 1])) == 0.0
    assert ece(np.array([1.0, 1.0]), np.array([0, 0])) == 1.0


def test_thresholds_keep_false_flags_and_unsure_within_limits():
    rng = np.random.default_rng(1)
    p = np.concatenate([rng.uniform(0, 0.6, 950), rng.uniform(0.3, 1, 50)])
    y = np.array([0] * 950 + [1] * 50)
    t = choose_thresholds(p, y, max_false_flag=0.05, max_unsure=0.10)
    states = [state(v, t) for v in p]
    ff = sum(s == "error" for s, yy in zip(states, y, strict=True) if yy == 0) / 950
    unsure = states.count("unsure") / len(p)
    assert ff <= 0.05 and unsure <= 0.10
    assert t.correct <= t.error


def test_state_and_rules():
    t = Thresholds(error=0.8, correct=0.3)
    assert [state(v, t) for v in (0.1, 0.5, 0.9)] == ["correct", "unsure", "error"]
    assert rule_state(True, True) == "error"
    assert rule_state(True, False) == rule_state(False, True) == "unsure"
    assert rule_state(False, False) == "correct"


def test_bands_and_needs_a_listen():
    assert band(0.97) == "independent" and band(0.92) == "instructional"
    assert band(0.80) == "frustration"
    sure = passage(["correct"] * 19 + ["error"])  # 95%
    assert sure.band == "independent" and not sure.needs_listen
    open_ = passage(["correct"] * 18 + ["unsure"] * 2)  # 90% to 100%
    assert open_.needs_listen
    assert open_.accuracy_low == 0.9 and open_.accuracy_high == 1.0
