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
]


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
            "INSERT INTO learners (alias, language) VALUES (?, ?)", (alias, language)
        )
        self.db.commit()
        return cur.lastrowid  # type: ignore[return-value]

    def save_attempt(self, **a) -> None:
        """Idempotent on request_id: a retried upload does not create a second attempt."""
        self.db.execute(
            "INSERT OR IGNORE INTO attempts (request_id, learner_id, passage_id, language,"
            " provider, transcript, duration_s, accuracy, wcpm, trace, latency_ms, created_at)"
            " VALUES (:request_id, :learner_id, :passage_id, :language, :provider, :transcript,"
            " :duration_s, :accuracy, :wcpm, :trace, :latency_ms, :created_at)",
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
