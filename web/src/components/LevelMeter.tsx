/** How loud the microphone hears the child, as a bar (0 to 1). */
export function LevelMeter({ value, label }: { value: number; label: string }) {
  const pct = Math.round(Math.min(1, Math.max(0, value)) * 100);
  return (
    <div
      className="level-meter"
      role="meter"
      aria-label={label}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={pct}
    >
      <span className="level-meter__fill" style={{ width: `${pct}%` }} />
    </div>
  );
}
