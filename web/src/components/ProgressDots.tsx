export function ProgressDots({ total, current }: { total: number; current: number }) {
  return (
    <span className="progressdots" role="img" aria-label={`Part ${current} of ${total}`}>
      {Array.from({ length: total }, (_, i) => (
        <span
          key={i}
          className={`progressdots__dot ${
            i < current - 1
              ? "progressdots__dot--done"
              : i === current - 1
                ? "progressdots__dot--current"
                : ""
          }`}
        />
      ))}
    </span>
  );
}
