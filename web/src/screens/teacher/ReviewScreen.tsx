import { useCallback, useEffect, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { api, isMock } from "../../api";
import type { ReviewItem, ReviewResult } from "../../api/types";
import { Button, Card, EmptyState, PageHeader, Select, StatusBadge } from "../../components";
import { useLoad } from "../../state/useLoad";
import { scriptClass, type Lang } from "../../theme/script";
import { shortDate } from "./ChildProfile";
import { TEACHER_NAV } from "./nav";


const MARKS: { result: ReviewResult; label: string; key: string }[] = [
  { result: "correct", label: "Read correctly", key: "1" },
  { result: "misread", label: "Misread", key: "2" },
  { result: "skipped", label: "Skipped", key: "3" },
];

const itemKey = (i: ReviewItem) => `${i.kind}/${i.request_id ?? i.child_id}/${i.index ?? ""}`;

/**
 * The words a teacher should hear before trusting the marks: words accepted only as a spelling
 * variant, and slips in otherwise strong readings. Play the child's own audio for the word,
 * then mark it. Keyboard: Space plays, 1 / 2 / 3 mark, → leaves it for later.
 */
export function ReviewScreen() {
  const navigate = useNavigate();
  const [lang, setLang] = useState<Lang>("kn-IN");
  const { data, error } = useLoad(() => api.reviewQueue(lang), [lang]);
  const [gone, setGone] = useState<Set<string>>(new Set());
  const [later, setLater] = useState<string[]>([]);
  const [failed, setFailed] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const audio = useRef<HTMLAudioElement | null>(null);

  // Left for later goes to the back of the line.
  const queue = (data ?? [])
    .filter((i) => !gone.has(itemKey(i)))
    .sort((a, b) => later.indexOf(itemKey(a)) - later.indexOf(itemKey(b)));
  const item = queue[0] ?? null;
  const clip =
    item?.kind === "word" && item.has_audio && item.request_id != null && item.index != null
      ? api.clipUrl(item.request_id, item.index)
      : null;

  const play = useCallback(() => {
    if (!audio.current) return;
    audio.current.currentTime = 0;
    void audio.current.play().catch(() => {
      /* blocked until the page has been clicked once */
    });
  }, []);

  // Play each new word once by itself: the fastest way through the queue.
  useEffect(() => {
    if (clip) play();
  }, [clip, play]);

  const mark = useCallback(
    async (result: ReviewResult) => {
      if (!item || item.kind !== "word" || saving) return;
      setSaving(true);
      setFailed(null);
      try {
        await api.markWord(item.request_id!, item.index!, result);
        setGone((g) => new Set(g).add(itemKey(item)));
      } catch {
        setFailed("Could not save the mark. Try again.");
      }
      setSaving(false);
    },
    [item, saving],
  );

  const skip = useCallback(() => {
    if (!item) return;
    setLater((l) => [...l.filter((k) => k !== itemKey(item)), itemKey(item)]);
  }, [item]);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      const el = e.target as HTMLElement | null;
      if (el && (el.tagName === "INPUT" || el.tagName === "SELECT" || el.tagName === "TEXTAREA")) {
        return;
      }
      const m = MARKS.find((x) => x.key === e.key);
      if (m) {
        e.preventDefault();
        void mark(m.result);
      } else if (e.key === " " && clip) {
        e.preventDefault();
        play();
      } else if (e.key === "ArrowRight") {
        e.preventDefault();
        skip();
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [mark, play, skip, clip]);

  return (
    <>
      <PageHeader back backTo="/teacher" nav={TEACHER_NAV} />
      <div className="screen-body">
        <h1 className="card__title">Words to hear</h1>
        <p className="reader-meta">
          The speech service can mishear a child. Listen to these words and set the mark yourself;
          your mark replaces the computer’s everywhere.
        </p>

        <div className="workspace workspace--w300">
          <div className="stack">
            <Select
              label="Language"
              value={lang}
              onChange={(v) => {
                setLang(v as Lang);
                setLater([]);
              }}
              options={[
                { value: "kn-IN", label: "ಕನ್ನಡ · Kannada" },
                { value: "ta-IN", label: "தமிழ் · Tamil" },
                { value: "hi-IN", label: "हिंदी · Hindi" },
              ]}
            />
            {data && (
              <p className="note" role="status">
                {queue.length} {queue.length === 1 ? "item" : "items"} left
              </p>
            )}
            <Card>
              <p className="eyebrow">Keyboard</p>
              <p className="note">
                Space plays. 1 correct, 2 misread, 3 skipped. The right arrow goes on.
              </p>
            </Card>
          </div>

          <div className="stack">
            {error ? (
              <EmptyState title="Could not load the queue">
                <p className="note">Check the connection, then open this page again.</p>
              </EmptyState>
            ) : !data ? (
              <p className="note" role="status">
                Loading…
              </p>
            ) : !item ? (
              <EmptyState title="Nothing to hear">
                <p className="note">Every mark in this language has been checked.</p>
                <Link className="screen__link" to="/teacher">
                  Back to class
                </Link>
              </EmptyState>
            ) : item.kind === "placement" ? (
              <Card>
                <p className="eyebrow">
                  {item.child} · reading level <StatusBadge tone="warning">Listen again</StatusBadge>
                </p>
                <p className="reader-name">{item.reason}</p>
                <div className="actions">
                  <Button onClick={() => navigate(`/teacher/child/${item.child_id}/placement`)}>
                    Check {item.child.split(" ")[0]}’s level again
                  </Button>
                  <Button variant="ghost" onClick={skip}>
                    Later
                  </Button>
                </div>
              </Card>
            ) : (
              <Card>
                <p className="eyebrow">
                  {item.child} · {shortDate(item.at)} ·{" "}
                  <span className={scriptClass(lang)} lang={lang}>
                    {item.title ?? item.passage_id}
                  </span>
                </p>
                <p className={`review-word ${scriptClass(lang)}`} lang={lang}>
                  {item.word}
                </p>
                <p className="note">
                  {item.op === "skipped" ? (
                    "Not heard: marked skipped"
                  ) : item.op === "substituted" ? (
                    <>
                      Heard as{" "}
                      <span className={scriptClass(lang)} lang={lang}>
                        {item.said}
                      </span>
                    </>
                  ) : (
                    <>
                      Heard as{" "}
                      <span className={scriptClass(lang)} lang={lang}>
                        {item.said}
                      </span>
                      , counted correct
                    </>
                  )}{" "}
                  · {item.reason}
                </p>

                {clip ? (
                  <>
                    <audio ref={audio} src={clip} preload="auto" />
                    <Button variant="outline" icon="audio" onClick={play}>
                      Play the child (Space)
                    </Button>
                    <p className="note">The clip is cut by estimate and includes a little of the next word.</p>
                  </>
                ) : (
                  <p className="note">
                    {isMock ? "The demo has no recordings." : "No recording was kept for this reading."}
                  </p>
                )}

                <div className="review-marks" role="group" aria-label="Your mark">
                  {MARKS.map((m) => (
                    <Button
                      key={m.result}
                      variant={m.result === "correct" ? "primary" : "outline"}
                      disabled={saving}
                      onClick={() => void mark(m.result)}
                      aria-keyshortcuts={m.key}
                    >
                      {m.label} ({m.key})
                    </Button>
                  ))}
                  <Button variant="ghost" onClick={skip} aria-keyshortcuts="ArrowRight">
                    Later (→)
                  </Button>
                </div>
                {failed && (
                  <p className="field__error" role="alert">
                    {failed}
                  </p>
                )}
              </Card>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
