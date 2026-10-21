import { Link } from "react-router-dom";
import "./ScreenError.css";

/**
 * Fallback shown when a screen throws. Mirrors the design's recovery screens
 * (section 04): plain language, one retry, a way back that always works.
 */
export function ScreenError({ error, onRetry }: { error: Error; onRetry: () => void }) {
  return (
    <section className="screen-error" role="alert" aria-live="assertive">
      <div className="screen-error__card">
        <h1 className="screen-error__title">This screen stopped working</h1>
        <p className="screen-error__text">
          Something went wrong on this screen only. The rest of the app is fine — you can try
          again, or go back to the start.
        </p>
        <pre className="screen-error__detail">{error.message}</pre>
        <div className="screen-error__actions">
          <button type="button" className="screen-error__button" onClick={onRetry}>
            Try again
          </button>
          <Link className="screen-error__link" to="/">
            Back to start
          </Link>
        </div>
      </div>
    </section>
  );
}
