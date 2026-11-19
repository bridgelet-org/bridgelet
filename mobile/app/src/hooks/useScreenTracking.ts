import { useEffect } from "react";
import { track } from "../../../services/analytics";

export function useScreenTracking(screen: string) {
  useEffect(() => {
    track({ name: "Screen Viewed", params: { screen } });
  }, [screen]);
}
