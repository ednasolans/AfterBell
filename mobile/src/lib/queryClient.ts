import { focusManager, QueryClient } from "@tanstack/react-query";
import { AppState, Platform, type AppStateStatus } from "react-native";

// One client for the whole app: it holds the cache of every query
export const queryClient = new QueryClient();

// React Native has no browser "window focus" event, so we tell TanStack Query
// when the app comes back to the foreground: queries marked as stale are refetched
AppState.addEventListener("change", (status: AppStateStatus) => {
  if (Platform.OS !== "web") {
    focusManager.setFocused(status === "active");
  }
});