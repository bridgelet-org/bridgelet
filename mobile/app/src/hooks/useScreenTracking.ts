import { useEffect } from "react";
import { track } from "../analytics/analytics";

export function useScreenTracking(screen: string) {
  useEffect(() => {
    track({
      name: "Page Viewed",
      params: { journey: "shared", page: screen, entry_source: "unknown" },
    });
  }, [screen]);
}
