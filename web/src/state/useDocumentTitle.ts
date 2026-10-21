import { useEffect } from "react";

/** Sets the tab title; every screen goes through PageHeader, which calls this. */
export function useDocumentTitle(title: string) {
  useEffect(() => {
    document.title = title === "Akshara" ? "Akshara" : `${title} · Akshara`;
  }, [title]);
}
