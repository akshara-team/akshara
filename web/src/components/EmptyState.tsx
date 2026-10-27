import type { ReactNode } from "react";

export function EmptyState({ title, children }: { title: ReactNode; children?: ReactNode }) {
  return (
    <div className="emptystate">
      <h2 className="card__title">{title}</h2>
      {children}
    </div>
  );
}
