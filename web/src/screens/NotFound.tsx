import { Link } from "react-router-dom";

export function NotFound() {
  return (
    <section className="screen">
      <h1 className="screen__title">Nothing here</h1>
      <Link className="screen__link" to="/">
        Back to start →
      </Link>
    </section>
  );
}
