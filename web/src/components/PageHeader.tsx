import { Link, NavLink, useLocation } from "react-router-dom";
import { load as loadChild } from "../state/storage";
import { useDocumentTitle } from "../state/useDocumentTitle";
import { useIsDesktop } from "../state/useMediaQuery";
import { Logo } from "./Logo";
import { ArrowLeftIcon } from "./icons";

const TITLES: Record<string, string> = {
  "/": "Welcome",
  "/switch": "Welcome",
  "/home": "My reading",
  "/reader": "Choose a reader",
  "/checking": "Checking",
  "/feedback": "Your reading",
  "/results": "Results",
  "/practice": "Practice",
  "/teacher": "Class",
  "/teacher/story": "Story",
  "/teacher/review": "Review",
  "/teacher/reliability": "Reliability",
  "/teacher/sentences": "Sentences",
  "/practice/sentence": "Practice",
  "/teacher/add": "Add child",
};

function titleFor(pathname: string): string {
  if (pathname.startsWith("/read/")) return "Reading";
  if (pathname.startsWith("/teacher/child/") && pathname.includes("/reading/")) return "Reading";
  if (pathname.startsWith("/teacher/child/") && pathname.endsWith("/placement")) return "Level";
  if (pathname.startsWith("/teacher/child/")) return "Child";
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
 * The teacher's header: the logo is the way home, the back link has a label, and the
 * sections are a row of links (tabs under the header on a phone). Child screens use
 * their own frame (Book.tsx).
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
  const home = child.reader ? "/home" : "/switch";

  return (
    <header className="page-header">
      <div className="page-header__row">
        <Link className="page-header__logo" to={home} aria-label={`${brand} home`}>
          <Logo lang={child.lang} size={36} />
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
            {nav.map((tab) => (
              <NavLink
                key={tab.to}
                to={tab.to}
                end
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

      </div>

      {nav && nav.length > 0 && !isDesktop && (
        <nav className="teacher-tabs" aria-label="Teacher sections">
          {nav.map((tab) => (
            <NavLink
              key={tab.to}
              to={tab.to}
              end
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
