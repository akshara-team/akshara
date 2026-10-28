"""The API serves requests on several threads and they share one Store (one SQLite
connection). Each Store call must be atomic, or one request's commit can cut off another's
query: on CI that showed as a known child answering 404 while another upload was saved."""

import threading

from akshara.store import Store


def test_parallel_reads_and_writes_never_lose_a_row(tmp_path):
    store = Store(tmp_path / "t.sqlite")
    kid = store.create_child("Asha", "kn-IN", consent_date="2026-10-01")
    errors: list[str] = []

    def reader():
        for _ in range(300):
            try:
                if store.child(kid) is None:
                    errors.append("child vanished")
                store.children()
            except Exception as e:  # noqa: BLE001 - any failure here is the bug
                errors.append(repr(e))

    def writer(n: int):
        for i in range(150):
            try:
                store.update_child(kid, grade=1 + (i % 5))
                store.save_mark(f"w{n}-{i}", 0, "correct")
            except Exception as e:  # noqa: BLE001
                errors.append(repr(e))

    threads = [threading.Thread(target=reader) for _ in range(4)]
    threads += [threading.Thread(target=writer, args=(n,)) for n in range(4)]
    for t in threads:
        t.start()
    for t in threads:
        t.join()
    assert errors == []
