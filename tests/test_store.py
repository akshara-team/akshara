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


def test_old_database_gains_part_index(tmp_path):
    import sqlite3

    path = tmp_path / "old.sqlite"
    db = sqlite3.connect(path)
    db.executescript(MIGRATIONS[0])
    db.execute("PRAGMA user_version = 1")
    db.commit()
    db.close()
    s = Store(path)  # opening runs only the missing migration
    cols = [r["name"] for r in s.db.execute("PRAGMA table_info(attempts)")]
    assert "part_index" in cols
