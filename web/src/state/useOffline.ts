import { useEffect } from "react";
import { useNavigate } from "react-router-dom";

/**
 * Sends the child to the offline recovery screen if the browser drops
 * connection mid-flow. The design's offline screen keeps the reading context
 * and offers a retry, so we route rather than blanking the page.
 */
export function useOfflineRedirect() {
  const navigate = useNavigate();

  useEffect(() => {
    function onOffline() {
      navigate("/recovery/offline");
    }
    window.addEventListener("offline", onOffline);
    return () => window.removeEventListener("offline", onOffline);
  }, [navigate]);
}
