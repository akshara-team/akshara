import { Link, NavLink, useLocation } from "react-router-dom";
import { load as loadChild } from "../state/storage";
import { useDocumentTitle } from "../state/useDocumentTitle";
import { useIsDesktop } from "../state/useMediaQuery";
import { Avatar } from "./Avatar";
import { ArrowLeftIcon } from "./icons";

const TABS = [
  { key: "class", label: "Class", to: "/teacher", end: true },
  { key: "story", label: "Story", to: "/teacher/story", end: true },
  { key: "add", label: "Add child", to: "/teacher/add", end: true },
] as const;

const TITLES: Record<string, string> = {
  "/": "Welcome",
  "/switch": "Welcome",
  "/home": "My reading",
  "/reader": "Choose a reader",
  "/checking": "Checking",
  "/feedback": "Your reading",
  "/results": "Results",
  "/teacher": "Class",
  "/teacher/story": "Story",
  "/teacher/add": "Add child",
};

function titleFor(pathname: string): string {
  if (pathname.startsWith("/read/")) return "Reading";
  if (pathname.startsWith("/teacher/child/")) return "Child";
  if (pathname.startsWith("/teacher/attempt/")) return "Attempt";
  if (pathname.startsWith("/teacher/edit/")) return "Edit child";
  if (pathname.startsWith("/recovery/")) return "Recovery";
  return TITLES[pathname] ?? "Akshara";
}

/** A friendly label for a back destination, so it is never a bare arrow. */
function labelFor(to: string | undefined): string {
  if (!to) return "Back";
  if (to === "/home" || to === "/") return "Home";
  if (to === "/switch" || to === "/reader") return "Start";
  if (to === "/teacher") return "Class";
  if (to === "/teacher/story") return "Story";
  if (to.startsWith("/teacher/child")) return "Child";
  return "Back";
}

/**
 * The one header for every screen: the logo is the way home, the back link has
 * a label, teacher routes get navigation, and child routes get the account menu
 * (switch reader / language / teacher view).
 */
export function PageHeader({
  brand = "Akshara",
  back = false,
  backTo,
  nav,
  badge,
}: {
  brand?: string;
  back?: boolean;
  backTo?: string;
  /** Teacher navigation; also becomes the mobile tab bar. */
  nav?: { label: string; to: string }[];
  badge?: string;
}) {
  const { pathname } = useLocation();
  useDocumentTitle(titleFor(pathname));
  const isDesktop = useIsDesktop();

  const child = loadChild();
  const isTeacher = pathname.startsWith("/teacher");
  const home = child.reader ? "/home" : "/switch";
  const showAccount = Boolean(child.reader) && !isTeacher && pathname !== "/" && pathname !== "/switch";

  return (
    <header className="page-header">
      <div className="page-header__row">
        <Link className="page-header__logo" to={home} aria-label={`${brand} home`}>
          <img src={`${import.meta.env.BASE_URL}logo.png`} alt={brand} height={32} />
        </Link>

        {back && (
          <Link className="page-header__back" to={backTo ?? home}>
            <ArrowLeftIcon width={18} height={18} />
            <span>{labelFor(backTo)}</span>
          </Link>
        )}

        <span className="page-header__spacer" />

        {nav && nav.length > 0 && isDesktop && (
          <nav className="page-header__nav" aria-label="Teacher">
            {TABS.map((tab) => (
              <NavLink
                key={tab.key}
                to={tab.to}
                end={tab.end}
                className={({ isActive }) =>
                  `page-header__link ${isActive ? "page-header__link--active" : ""}`
                }
              >
                {tab.label}
              </NavLink>
            ))}
            {badge && <span className="page-header__badge">{badge}</span>}
          </nav>
        )}

        {showAccount && (
          <details className="account">
            <summary className="account__trigger" aria-label="My account">
              <Avatar initials={child.reader?.initials ?? "·"} size="sm" />
            </summary>
            <div className="account__menu">
              <Link to="/switch">Switch reader</Link>
              <Link to="/switch">Change language</Link>
              <Link to="/teacher">Teacher view</Link>
            </div>
          </details>
        )}
      </div>

      {nav && nav.length > 0 && !isDesktop && (
        <nav className="teacher-tabs" aria-label="Teacher sections">
          {TABS.map((tab) => (
            <NavLink
              key={tab.key}
              to={tab.to}
              end={tab.end}
              className={({ isActive }) =>
                `teacher-tabs__tab ${isActive ? "teacher-tabs__tab--active" : ""}`
              }
            >
              {tab.label}
            </NavLink>
          ))}
        </nav>
      )}
    </header>
  );
}
