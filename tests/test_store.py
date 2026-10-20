from akshara.store import MIGRATIONS, Store


def test_migrations_are_applied_once(tmp_path):
    path = tmp_path / "a.sqlite"
    Store(path)
    s = Store(path)  # reopening must not re-run the migration
    assert s.db.execute("PRAGMA user_version").fetchone()[0] == len(MIGRATIONS)


def test_learner_is_reused():
    s = Store(":memory:")
    assert s.learner("asha", "hi-IN") == s.learner("asha", "hi-IN")
