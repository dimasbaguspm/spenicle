import { useMemo, type FC, type PropsWithChildren } from "react";
import { PageLoader } from "@dimasbaguspm/versaur";
import { WebAPIContext } from "./context";
import { useGeolocation } from "./use-geolocation";

export const WebAPIProvider: FC<PropsWithChildren> = ({ children }) => {
  const geolocation = useGeolocation();
  // Future: const camera = useCamera();
  // Future: const notifications = useNotifications();

  const contextValue = useMemo(
    () => ({
      geolocation,
      // camera,
      // notifications,
    }),
    [geolocation],
  );

  // Show loading screen only when initializing AND user has granted permission
  // Don't block app if permission is denied/prompt/unavailable
  const shouldShowLoader = geolocation.isInitializing && geolocation.isGranted;

  if (shouldShowLoader) {
    return <PageLoader />;
  }

  return (
    <WebAPIContext.Provider value={contextValue}>
      {children}
    </WebAPIContext.Provider>
  );
};
