import type { ReactNode } from "react";
import { Navigate, Route, Routes, useLocation } from "react-router-dom";
import { ErrorBoundary } from "./components/ErrorBoundary";
import { CheckingScreen } from "./screens/child/CheckingScreen";
import { ChildHome } from "./screens/child/ChildHome";
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
import { load as loadChild } from "./state/storage";
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

/** Owns the shell: one responsive frame for every route, plus offline handling. */
function Shell({ children }: { children: ReactNode }) {
  useOfflineRedirect();
  return (
    <div className="app-shell">
      <main className="app-main">{children}</main>
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
