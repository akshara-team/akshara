import { NavLink, useNavigate } from "react-router-dom";
import { ArrowLeftIcon } from "./icons";

export type NavItem = { label: string; to: string };

export function TopBar({
  brand = "Akshara",
  back = false,
  backTo,
  nav,
  badge,
}: {
  brand?: string;
  back?: boolean;
  backTo?: string;
  /** Teacher navigation; shown on desktop only, per the desktop frames. */
  nav?: NavItem[];
  badge?: string;
}) {
  const navigate = useNavigate();
  return (
    <header className="topbar">
      <span className="topbar__brand">{brand}</span>

      {nav && nav.length > 0 && (
        <nav className="topbar__nav" aria-label="Teacher">
          {nav.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                `topbar__link ${isActive ? "topbar__link--active" : ""}`
              }
            >
              {item.label}
            </NavLink>
          ))}
          {badge && <span className="topbar__badge">{badge}</span>}
        </nav>
      )}

      {back && (
        <button
          type="button"
          className="topbar__back"
          aria-label="Go back"
          onClick={() => (backTo ? navigate(backTo) : navigate(-1))}
        >
          <ArrowLeftIcon width={20} height={20} />
        </button>
      )}
    </header>
  );
}
