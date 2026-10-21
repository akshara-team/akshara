export function Avatar({
  initials,
  selected = false,
  size = "md",
}: {
  initials: string;
  selected?: boolean;
  size?: "md" | "sm";
}) {
  return (
    <span
      className={`avatar avatar--${size} ${selected ? "avatar--selected" : ""}`}
      aria-hidden="true"
    >
      {initials}
    </span>
  );
}
