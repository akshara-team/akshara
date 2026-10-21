/** `label` is the accessible name, e.g. "Reading progress"; screen readers need one. */
export function ProgressBar({ value, label }: { value: number; label: string }) {
  const pct = Math.max(0, Math.min(100, value));
  return (
    <div
      className="progressbar"
      role="progressbar"
      aria-label={label}
      aria-valuenow={pct}
      aria-valuemin={0}
      aria-valuemax={100}
    >
      <div className="progressbar__fill" style={{ width: `${pct}%` }} />
    </div>
  );
}
