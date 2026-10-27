"""SQLite storage with ordered migrations. Attempts keep the full trace of what was heard."""

import json
import sqlite3
import time
from pathlib import Path

MIGRATIONS = [
    """
    CREATE TABLE learners (
        id INTEGER PRIMARY KEY,
        alias TEXT NOT NULL UNIQUE,
        language TEXT NOT NULL
    );
    CREATE TABLE attempts (
        id INTEGER PRIMARY KEY,
        request_id TEXT NOT NULL UNIQUE,
        learner_id INTEGER NOT NULL REFERENCES learners(id),
        passage_id TEXT NOT NULL,
        language TEXT NOT NULL,
        provider TEXT NOT NULL,
        transcript TEXT NOT NULL,
        duration_s REAL,
        accuracy REAL NOT NULL,
        wcpm REAL,
        trace TEXT NOT NULL,
        latency_ms INTEGER NOT NULL,
        created_at REAL NOT NULL
    );
    """,
    # 2: which part of the passage was read; NULL means the whole passage
    "ALTER TABLE attempts ADD COLUMN part_index INTEGER;",
    # 3: children the teacher manages; a reading session groups the parts of one story
    """
    ALTER TABLE learners ADD COLUMN grade INTEGER;
    ALTER TABLE learners ADD COLUMN avatar TEXT;
    ALTER TABLE learners ADD COLUMN created_at REAL;
    ALTER TABLE attempts ADD COLUMN session_id TEXT;
    CREATE INDEX attempts_by_learner ON attempts(learner_id, created_at);
    """,
    # 4: placement tests and what the learner model believes about each skill
    """
    CREATE TABLE placements (
        id INTEGER PRIMARY KEY,
        child_id INTEGER NOT NULL REFERENCES learners(id),
        seed INTEGER NOT NULL,
        items TEXT NOT NULL DEFAULT '[]',
        level TEXT,
        uncertain INTEGER NOT NULL DEFAULT 0,
        created_at REAL NOT NULL,
        finished_at REAL
    );
    CREATE INDEX placements_by_child ON placements(child_id, created_at);
    CREATE TABLE skill_state (
        child_id INTEGER NOT NULL REFERENCES learners(id),
        skill TEXT NOT NULL,
        p REAL NOT NULL,
        seen INTEGER NOT NULL,
        updated_at REAL NOT NULL,
        PRIMARY KEY (child_id, skill)
    );
    """,
]

CHILD_FIELDS = ("alias", "language", "grade", "avatar")


class DuplicateAlias(ValueError):
    """Another child already has this alias."""


def summarise(group: list[dict]) -> dict:
    """One reading of a story from its part attempts. A part read twice counts its last try."""
    latest: dict = {}
    for a in sorted(group, key=lambda a: a["created_at"]):
        latest[a["part_index"]] = a
    parts = [latest[k] for k in sorted(latest, key=lambda k: -1 if k is None else k)]
    words = [w for a in parts for w in a["trace"]]
    total = sum(1 for w in words if w["op"] != "inserted")
    correct = sum(1 for w in words if w["op"] == "correct")
    durations = [a["duration_s"] for a in parts]
    seconds = sum(durations) if all(d for d in durations) else None
    return {
        "session": group[0]["session_id"] or group[0]["request_id"],
        "passage_id": group[0]["passage_id"],
        "language": group[0]["language"],
        "at": min(a["created_at"] for a in group),
        "parts": [a["part_index"] for a in parts if a["part_index"] is not None],
        "correct": correct,
        "total": total,
        "accuracy": correct / total if total else 0.0,
        "wcpm": correct / (seconds / 60) if seconds else None,
        "seconds": seconds,
        "transcript": " ".join(a["transcript"] for a in parts if a["transcript"]),
        "words": words,
    }


class Store:
    def __init__(self, path: Path | str):
        if str(path) != ":memory:":
            Path(path).parent.mkdir(parents=True, exist_ok=True)
        self.db = sqlite3.connect(str(path), check_same_thread=False)
        self.db.row_factory = sqlite3.Row
        self._migrate()

    def _migrate(self) -> None:
        (version,) = self.db.execute("PRAGMA user_version").fetchone()
        for n, sql in enumerate(MIGRATIONS[version:], start=version + 1):
            self.db.executescript(sql)
            self.db.execute(f"PRAGMA user_version = {n}")
        self.db.commit()

    def learner(self, alias: str, language: str) -> int:
        row = self.db.execute("SELECT id FROM learners WHERE alias = ?", (alias,)).fetchone()
        if row:
            return row["id"]
        cur = self.db.execute(
            "INSERT INTO learners (alias, language, created_at) VALUES (?, ?, ?)",
            (alias, language, time.time()),
        )
        self.db.commit()
        return cur.lastrowid  # type: ignore[return-value]

    def create_child(
        self, alias: str, language: str, grade: int | None = None, avatar: str | None = None
    ) -> int:
        try:
            cur = self.db.execute(
                "INSERT INTO learners (alias, language, grade, avatar, created_at)"
                " VALUES (?, ?, ?, ?, ?)",
                (alias, language, grade, avatar, time.time()),
            )
        except sqlite3.IntegrityError as e:
            raise DuplicateAlias(alias) from e
        self.db.commit()
        return cur.lastrowid  # type: ignore[return-value]

    def update_child(self, child_id: int, **fields) -> None:
        fields = {k: v for k, v in fields.items() if k in CHILD_FIELDS}
        if not fields:
            return
        sets = ", ".join(f"{k} = :{k}" for k in fields)
        try:
            self.db.execute(
                f"UPDATE learners SET {sets} WHERE id = :id", {**fields, "id": child_id}
            )
        except sqlite3.IntegrityError as e:
            raise DuplicateAlias(fields.get("alias", "")) from e
        self.db.commit()

    def child(self, child_id: int) -> dict | None:
        row = self.db.execute("SELECT * FROM learners WHERE id = ?", (child_id,)).fetchone()
        return dict(row) if row else None

    def children(self, language: str | None = None) -> list[dict]:
        rows = self.db.execute(
            "SELECT * FROM learners WHERE ? IS NULL OR language = ? ORDER BY alias COLLATE NOCASE",
            (language, language),
        ).fetchall()
        return [dict(r) for r in rows]

    def readings(self, child_id: int) -> list[dict]:
        """The child's readings, newest first, each grouping the parts of one story session."""
        rows = self.db.execute(
            "SELECT * FROM attempts WHERE learner_id = ? ORDER BY created_at", (child_id,)
        ).fetchall()
        groups: dict[str, list[dict]] = {}
        for r in rows:
            a = dict(r) | {"trace": json.loads(r["trace"])}
            groups.setdefault(a["session_id"] or a["request_id"], []).append(a)
        return sorted((summarise(g) for g in groups.values()), key=lambda s: -s["at"])

    def create_placement(self, child_id: int, seed: int) -> int:
        cur = self.db.execute(
            "INSERT INTO placements (child_id, seed, created_at) VALUES (?, ?, ?)",
            (child_id, seed, time.time()),
        )
        self.db.commit()
        return cur.lastrowid  # type: ignore[return-value]

    def placement(self, placement_id: int) -> dict | None:
        row = self.db.execute("SELECT * FROM placements WHERE id = ?", (placement_id,)).fetchone()
        return dict(row) | {"items": json.loads(row["items"])} if row else None

    def save_placement(
        self, placement_id: int, items: list, level: str | None, uncertain: bool
    ) -> None:
        self.db.execute(
            "UPDATE placements SET items = ?, level = ?, uncertain = ?,"
            " finished_at = CASE WHEN ? IS NULL THEN NULL ELSE ? END WHERE id = ?",
            (
                json.dumps(items, ensure_ascii=False),
                level,
                int(uncertain),
                level,
                time.time(),
                placement_id,
            ),
        )
        self.db.commit()

    def latest_level(self, child_id: int) -> dict | None:
        """The child's last finished placement: level, uncertain, when."""
        row = self.db.execute(
            "SELECT id, level, uncertain, finished_at FROM placements"
            " WHERE child_id = ? AND level IS NOT NULL ORDER BY finished_at DESC LIMIT 1",
            (child_id,),
        ).fetchone()
        return dict(row) if row else None

    def skills(self, child_id: int) -> list[dict]:
        rows = self.db.execute(
            "SELECT skill, p, seen FROM skill_state WHERE child_id = ?", (child_id,)
        ).fetchall()
        return [dict(r) for r in rows]

    def save_skills(self, child_id: int, mastery: dict[str, float], seen: dict[str, int]) -> None:
        now = time.time()
        self.db.executemany(
            "INSERT INTO skill_state (child_id, skill, p, seen, updated_at) VALUES (?, ?, ?, ?, ?)"
            " ON CONFLICT(child_id, skill) DO UPDATE SET p = excluded.p, seen = excluded.seen,"
            " updated_at = excluded.updated_at",
            [(child_id, s, p, seen.get(s, 0), now) for s, p in mastery.items()],
        )
        self.db.commit()

    def save_attempt(self, **a) -> None:
        """Idempotent on request_id: a retried upload does not create a second attempt."""
        a.setdefault("part_index", None)
        a.setdefault("session_id", None)
        self.db.execute(
            "INSERT OR IGNORE INTO attempts (request_id, learner_id, passage_id, language,"
            " provider, transcript, duration_s, accuracy, wcpm, trace, latency_ms, created_at,"
            " part_index, session_id)"
            " VALUES (:request_id, :learner_id, :passage_id, :language, :provider, :transcript,"
            " :duration_s, :accuracy, :wcpm, :trace, :latency_ms, :created_at, :part_index,"
            " :session_id)",
            {**a, "trace": json.dumps(a["trace"], ensure_ascii=False), "created_at": time.time()},
        )
        self.db.commit()

    def attempt(self, request_id: str) -> dict | None:
        row = self.db.execute(
            "SELECT * FROM attempts WHERE request_id = ?", (request_id,)
        ).fetchone()
        return dict(row) | {"trace": json.loads(row["trace"])} if row else None

    def class_summary(self) -> list[dict]:
        rows = self.db.execute(
            "SELECT l.alias, l.language, COUNT(*) AS attempts, AVG(a.accuracy) AS accuracy,"
            " AVG(a.wcpm) AS wcpm FROM attempts a JOIN learners l ON l.id = a.learner_id"
            " GROUP BY l.id ORDER BY l.alias"
        ).fetchall()
        return [dict(r) for r in rows]
