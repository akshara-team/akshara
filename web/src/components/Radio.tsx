import type { ReactNode } from "react";

export function Radio({
  selected,
  onSelect,
  children,
}: {
  selected: boolean;
  onSelect: () => void;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      role="radio"
      aria-checked={selected}
      className={`radio ${selected ? "radio--selected" : ""}`}
      onClick={onSelect}
    >
      <span className="radio__mark" aria-hidden="true" />
      <span>{children}</span>
    </button>
  );
}
