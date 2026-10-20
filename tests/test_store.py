from akshara.store import MIGRATIONS, Store


def test_migrations_are_applied_once(tmp_path):
    path = tmp_path / "a.sqlite"
    Store(path)
    s = Store(path)  # reopening must not re-run the migration
    assert s.db.execute("PRAGMA user_version").fetchone()[0] == len(MIGRATIONS)


def test_learner_is_reused():
    s = Store(":memory:")
    assert s.learner("asha", "hi-IN") == s.learner("asha", "hi-IN")


def test_variant_spelling_is_marked_check(tmp_path):
    from akshara.providers.fixture import FixtureSTT
    from akshara.service import assess

    wav = tmp_path / "clip.wav"
    wav.write_bytes(b"")
    a = assess(
        stt=FixtureSTT({"clip": "वो घर गया"}), store=Store(tmp_path / "t.db"), audio=wav,
        learner="a", passage_id="p", reference="वह घर गया", language="hi-IN",
    )  # fmt: skip
    assert [w["check"] for w in a.words] == [True, False, False]
    assert a.accuracy == 1.0
