import {
  AppLayout as VersaurAppLayout,
  MobileBreakpoint,
  PageLoader,
  TabletAndDesktopBreakpoint,
} from "@dimasbaguspm/versaur";
import { Suspense, type FC, type PropsWithChildren } from "react";
import { AppTopBar } from "./app-top-bar";
import { AppBottomBar } from "./app-bottom-bar";

export const AppLayout: FC<PropsWithChildren> = ({ children }) => {
  return (
    <VersaurAppLayout>
      <TabletAndDesktopBreakpoint>
        <VersaurAppLayout.TopRegion>
          <AppTopBar />
        </VersaurAppLayout.TopRegion>
      </TabletAndDesktopBreakpoint>
      <VersaurAppLayout.MainRegion>
        <Suspense fallback={<PageLoader />}>{children}</Suspense>
      </VersaurAppLayout.MainRegion>
      <MobileBreakpoint>
        <VersaurAppLayout.BottomRegion>
          <AppBottomBar />
        </VersaurAppLayout.BottomRegion>
      </MobileBreakpoint>
    </VersaurAppLayout>
  );
};
