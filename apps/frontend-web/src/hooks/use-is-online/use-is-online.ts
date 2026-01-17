import { onlineManager } from "@tanstack/react-query";
import { useSyncExternalStore } from "react";

export const useIsOnline = (): boolean => {
  return useSyncExternalStore(onlineManager.subscribe, () =>
    onlineManager.isOnline()
  );
};
