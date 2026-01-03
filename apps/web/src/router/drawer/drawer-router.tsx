import { Drawer, useDesktopBreakpoint } from "@dimasbaguspm/versaur";

import { useDrawerProvider } from "@/providers/drawer-provider";
import { DRAWER_ROUTES } from "@/constant/drawer-routes";

import NewAccountDrawer from "./new-account-drawer";

interface DrawerParams {
  accountId?: number;
}

interface DrawerState {
  payload?: Record<string, string>;
  returnToDrawer?: string;
  returnToDrawerId?: Record<string, string> | null;
}

export const DrawerRouter = () => {
  const isDesktop = useDesktopBreakpoint();
  const { isOpen, drawerId, params, state, closeDrawer } = useDrawerProvider<
    DrawerParams,
    DrawerState
  >();

  const is = (id: string) => drawerId === id;
  //   const hasParam = (param: keyof typeof params) =>
  //     params && typeof params === "object" ? param in params : false;
  //   const hasState = (stateKey: keyof typeof state) =>
  //     state && typeof state === "object" ? stateKey in state : false;

  return (
    <Drawer
      isOpen={isOpen}
      onClose={closeDrawer}
      size={isDesktop ? "lg" : "full"}
    >
      {is(DRAWER_ROUTES.NEW_ACCOUNT) && <NewAccountDrawer />}
    </Drawer>
  );
};
