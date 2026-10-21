export function StatCard({
  label,
  value,
  caption,
}: {
  label: string;
  value: string;
  caption?: string;
}) {
  return (
    <div className="statcard">
      <span className="statcard__label">{label}</span>
      <span className="statcard__value">{value}</span>
      {caption && <span className="statcard__caption">{caption}</span>}
    </div>
  );
}
