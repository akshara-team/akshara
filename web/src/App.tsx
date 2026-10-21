import type { ReactNode } from "react";
import { Route, Routes, useLocation } from "react-router-dom";
import { ErrorBoundary } from "./components/ErrorBoundary";
import { CheckingScreen } from "./screens/child/CheckingScreen";
import { ChooseReader } from "./screens/child/ChooseReader";
import { FeedbackScreen } from "./screens/child/FeedbackScreen";
import { ReadingScreen } from "./screens/child/ReadingScreen";
import { ResultsScreen } from "./screens/child/ResultsScreen";
import { RoleSelection } from "./screens/child/RoleSelection";
import { NotFound } from "./screens/NotFound";
import { RecoveryScreen } from "./screens/recovery/RecoveryScreen";
import { AttemptDetails } from "./screens/teacher/AttemptDetails";
import { ChildForm } from "./screens/teacher/ChildForm";
import { ChildProfile } from "./screens/teacher/ChildProfile";
import { SelectStory } from "./screens/teacher/SelectStory";
import { TeacherDashboard } from "./screens/teacher/TeacherDashboard";
import { SessionProvider } from "./state/session";
import { useOfflineRedirect } from "./state/useOffline";
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

/** Owns the shell: the wide (desktop) layout and the offline listener. */
function Shell({ children }: { children: ReactNode }) {
  const { pathname } = useLocation();
  useOfflineRedirect();
  const wide = pathname.startsWith("/teacher");
  return (
    <div className="app-shell">
      <main className={`app-main ${wide ? "app-main--wide" : ""}`}>{children}</main>
    </div>
  );
}

export function App() {
  return (
    <SessionProvider>
      <Shell>
        <Routes>
          {/* Child flow */}
          <Route path="/" element={<Screen><RoleSelection /></Screen>} />
          <Route path="/reader" element={<Screen><ChooseReader /></Screen>} />
          <Route path="/read/:passageId" element={<Screen><ReadingScreen /></Screen>} />
          <Route path="/checking" element={<Screen><CheckingScreen /></Screen>} />
          <Route path="/feedback" element={<Screen><FeedbackScreen /></Screen>} />
          <Route path="/results" element={<Screen><ResultsScreen /></Screen>} />

          {/* Recovery */}
          <Route path="/recovery/:kind" element={<Screen><RecoveryScreen /></Screen>} />

          {/* Teacher */}
          <Route path="/teacher" element={<Screen><TeacherDashboard /></Screen>} />
          <Route path="/teacher/story" element={<Screen><SelectStory /></Screen>} />
          <Route
            path="/teacher/child/:childId"
            element={<Screen><ChildProfile /></Screen>}
          />
          <Route
            path="/teacher/attempt/:childId"
            element={<Screen><AttemptDetails /></Screen>}
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
