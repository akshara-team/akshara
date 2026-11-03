import { Link } from "react-router-dom";
import { Kolam } from "../components";
import { useDocumentTitle } from "../state/useDocumentTitle";

/** A link that leads nowhere: an unfinished kolam, and the way back. */
export function NotFound() {
  useDocumentTitle("Not found");
  return (
    <section className="lost">
      <Kolam seed="not-found" progress={0.35} />
      <h1 className="lost__title">Nothing here</h1>
      <Link to="/">Back to start</Link>
    </section>
  );
}
