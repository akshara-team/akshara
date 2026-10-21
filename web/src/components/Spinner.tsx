export function Spinner({ label }: { label?: string }) {
  return (
    <span className="spinner-wrap">
      <span className="spinner" role="status" aria-label={label ?? "Working"} />
      {label && <span className="statcard__caption">{label}</span>}
    </span>
  );
}
