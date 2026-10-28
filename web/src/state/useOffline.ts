import { useEffect, useRef } from "react";
import { useLocation, useNavigate } from "react-router-dom";

/**
 * Where losing the connection must not move the child: reading (it would stop the recording),
 * checking (it saves the reading for later itself), recovery, and the teacher's screens.
 */
export function staysOffline(pathname: string): boolean {
  return (
    pathname.startsWith("/read/") ||
    pathname === "/checking" ||
    pathname.startsWith("/recovery/") ||
    pathname.startsWith("/teacher")
  );
}

/**
 * Sends the child to the offline recovery screen if the browser drops connection on a screen
 * that needs it. The design's offline screen keeps the reading context and offers a retry, so
 * we route rather than blanking the page.
 */
export function useOfflineRedirect() {
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const where = useRef(pathname);
  where.current = pathname;

  useEffect(() => {
    function onOffline() {
      if (!staysOffline(where.current)) navigate("/recovery/offline");
    }
    window.addEventListener("offline", onOffline);
    return () => window.removeEventListener("offline", onOffline);
  }, [navigate]);
}
