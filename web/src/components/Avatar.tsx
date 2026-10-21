export function Avatar({
  initials,
  selected = false,
}: {
  initials: string;
  selected?: boolean;
}) {
  return (
    <span className={`avatar ${selected ? "avatar--selected" : ""}`} aria-hidden="true">
      {initials}
    </span>
  );
}
