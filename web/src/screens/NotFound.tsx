import { Link } from "react-router-dom";

export function NotFound() {
  return (
    <section className="screen-body">
      <div className="emptystate">
        <h1 className="card__title">Nothing here</h1>
        <Link className="screen__link" to="/">
          Back to start →
        </Link>
      </div>
    </section>
  );
}
