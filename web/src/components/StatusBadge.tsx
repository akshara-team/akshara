import type { ReactNode } from "react";

export function StatusBadge({
  tone = "neutral",
  children,
}: {
  tone?: "success" | "warning" | "neutral";
  children: ReactNode;
}) {
  return <span className={`statusbadge statusbadge--${tone}`}>{children}</span>;
}
