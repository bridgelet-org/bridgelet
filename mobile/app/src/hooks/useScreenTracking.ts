import { useEffect } from "react";
import { track } from "../analytics/analytics";

export function useScreenTracking(screen: string) {
  useEffect(() => {
    track({
      name: "Page Viewed",
      params: {
        page: screen,
        journey: "shared",
      },
    });
  }, [screen]);
}
