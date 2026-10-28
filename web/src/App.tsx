import { useEffect, useRef, type MouseEvent, type ReactNode, type RefObject } from "react";
import { Navigate, Route, Routes, useLocation } from "react-router-dom";
import { ErrorBoundary } from "./components/ErrorBoundary";
import { CheckingScreen } from "./screens/child/CheckingScreen";
import { ChildHome } from "./screens/child/ChildHome";
import { ChooseReader } from "./screens/child/ChooseReader";
import { FeedbackScreen } from "./screens/child/FeedbackScreen";
import { ReadingScreen } from "./screens/child/ReadingScreen";
import { PracticeScreen } from "./screens/child/PracticeScreen";
import { ResultsScreen } from "./screens/child/ResultsScreen";
import { RoleSelection } from "./screens/child/RoleSelection";
import { NotFound } from "./screens/NotFound";
import { RecoveryScreen } from "./screens/recovery/RecoveryScreen";
import { AttemptDetails } from "./screens/teacher/AttemptDetails";
import { PlacementScreen } from "./screens/teacher/PlacementScreen";
import { ReviewScreen } from "./screens/teacher/ReviewScreen";
import { ReliabilityScreen } from "./screens/teacher/ReliabilityScreen";
import { SentencesScreen } from "./screens/teacher/SentencesScreen";
import { SentenceScreen } from "./screens/child/SentenceScreen";
import { ChildForm } from "./screens/teacher/ChildForm";
import { ChildProfile } from "./screens/teacher/ChildProfile";
import { SelectStory } from "./screens/teacher/SelectStory";
import { TeacherDashboard } from "./screens/teacher/TeacherDashboard";
import { SessionProvider } from "./state/session";
import { load as loadChild } from "./state/storage";
import { useOfflineRedirect } from "./state/useOffline";
import { useOutboxSync, type Queued } from "./state/outbox";
import { api } from "./api";
import "./components/components.css";
import "./screens/screens.css";
import "./app.css";

/**
 * Each screen is wrapped in its own ErrorBoundary, keyed by pathname so that
 * navigating away from a crashed screen resets it. A failure on one screen
 * therefore leaves the shell and every other screen working.
 */
function Screen({ children }: { children: ReactNode }) {
  const { pathname } = useLocation();
  return <ErrorBoundary key={pathname}>{children}</ErrorBoundary>;
}

/**
 * After a route change, move focus to the new screen's heading (or the main region), so a
 * screen-reader user hears that the screen changed instead of staying on a control that no
 * longer exists. Not on first load: the browser already starts at the top of the page there.
 */
function useFocusOnRouteChange(main: RefObject<HTMLElement>) {
  const { pathname } = useLocation();
  const first = useRef(true);
  useEffect(() => {
    if (first.current) {
      first.current = false;
      return;
    }
    const target = main.current?.querySelector<HTMLElement>("h1") ?? main.current;
    if (!target) return;
    if (!target.hasAttribute("tabindex")) target.setAttribute("tabindex", "-1");
    target.focus();
  }, [pathname, main]);
}

/** Sends a reading saved while offline; the same request id makes a resend harmless. */
const sendQueued = (q: Queued) =>
  api.submitAttempt({ ...q, audio: q.audio ?? new Blob([], { type: "audio/wav" }) });

/** Owns the shell: one responsive frame for every route, plus offline handling. */
function Shell({ children }: { children: ReactNode }) {
  useOfflineRedirect();
  useOutboxSync(sendQueued);
  const main = useRef<HTMLElement>(null);
  useFocusOnRouteChange(main);

  // Handled in JS so the router never sees a "#main" hash change.
  function skipToContent(event: MouseEvent<HTMLAnchorElement>) {
    event.preventDefault();
    main.current?.focus();
  }

  return (
    <div className="app-shell">
      <a className="skip-link" href="#main" onClick={skipToContent}>
        Skip to content
      </a>
      <main id="main" className="app-main" ref={main} tabIndex={-1}>
        {children}
      </main>
    </div>
  );
}

/**
 * `/` is the entry only once. A child with a saved name goes straight home, so
 * reopening the app never asks "student or teacher?" again. `/switch` is the
 * explicit way back to role selection.
 */
function Entry() {
  return loadChild().reader ? <Navigate to="/home" replace /> : <RoleSelection />;
}

export function App() {
  return (
    <SessionProvider>
      <Shell>
        <Routes>
          {/* Child flow */}
          <Route path="/" element={<Screen><Entry /></Screen>} />
          <Route path="/switch" element={<Screen><RoleSelection /></Screen>} />
          <Route path="/home" element={<Screen><ChildHome /></Screen>} />
          <Route path="/reader" element={<Screen><ChooseReader /></Screen>} />
          <Route path="/read/:passageId" element={<Screen><ReadingScreen /></Screen>} />
          <Route path="/checking" element={<Screen><CheckingScreen /></Screen>} />
          <Route path="/feedback" element={<Screen><FeedbackScreen /></Screen>} />
          <Route path="/results" element={<Screen><ResultsScreen /></Screen>} />
          <Route path="/practice" element={<Screen><PracticeScreen /></Screen>} />
          <Route path="/practice/sentence" element={<Screen><SentenceScreen /></Screen>} />

          {/* Recovery */}
          <Route path="/recovery/:kind" element={<Screen><RecoveryScreen /></Screen>} />

          {/* Teacher */}
          <Route path="/teacher" element={<Screen><TeacherDashboard /></Screen>} />
          <Route path="/teacher/story" element={<Screen><SelectStory /></Screen>} />
          <Route path="/teacher/review" element={<Screen><ReviewScreen /></Screen>} />
          <Route path="/teacher/sentences" element={<Screen><SentencesScreen /></Screen>} />
          <Route
            path="/teacher/reliability"
            element={<Screen><ReliabilityScreen /></Screen>}
          />
          <Route
            path="/teacher/child/:childId"
            element={<Screen><ChildProfile /></Screen>}
          />
          <Route
            path="/teacher/child/:childId/reading/:session"
            element={<Screen><AttemptDetails /></Screen>}
          />
          <Route
            path="/teacher/child/:childId/placement"
            element={<Screen><PlacementScreen /></Screen>}
          />
          <Route
            path="/teacher/edit/:childId"
            element={<Screen><ChildForm mode="edit" /></Screen>}
          />
          <Route path="/teacher/add" element={<Screen><ChildForm mode="add" /></Screen>} />

          <Route path="*" element={<Screen><NotFound /></Screen>} />
        </Routes>
      </Shell>
    </SessionProvider>
  );
}
