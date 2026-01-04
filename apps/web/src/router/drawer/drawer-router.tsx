import { Drawer, useDesktopBreakpoint } from "@dimasbaguspm/versaur";

import { useDrawerProvider } from "@/providers/drawer-provider";
import { DRAWER_ROUTES } from "@/constant/drawer-routes";

import { AccountCreateDrawer } from "./account-create-drawer";
import { CategoryCreateDrawer } from "./category-create-drawer";
import { TransactionCreateDrawer } from "./transaction-create-drawer";
import { AccountSelectSingleDrawer } from "./account-select-single-drawer";
import { CategorySelectSingleDrawer } from "./category-select-single-drawer";

interface DrawerParams {
  accountId?: number;
  payloadId?: string;
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
  const hasParam = (param: keyof typeof params) =>
    params && typeof params === "object" ? param in params : false;
  const hasState = (stateKey: keyof typeof state) =>
    state && typeof state === "object" ? stateKey in state : false;

  const disableInteraction = (
    [
      DRAWER_ROUTES.SELECT_SINGLE_ACCOUNT,
      DRAWER_ROUTES.SELECT_SINGLE_CATEGORY,
    ] as string[]
  ).includes(drawerId || "");

  return (
    <Drawer
      isOpen={isOpen}
      onClose={closeDrawer}
      size={isDesktop ? "lg" : "full"}
      disableOverlayClickToClose={disableInteraction}
      disableEscapeKeyDown={disableInteraction}
    >
      {is(DRAWER_ROUTES.ACCOUNT_CREATE) && <AccountCreateDrawer />}
      {is(DRAWER_ROUTES.CATEGORY_CREATE) && <CategoryCreateDrawer />}
      {is(DRAWER_ROUTES.TRANSACTION_CREATE) && (
        <TransactionCreateDrawer payload={state?.payload} />
      )}
      {is(DRAWER_ROUTES.SELECT_SINGLE_ACCOUNT) &&
        hasState("payload") &&
        hasState("returnToDrawer") &&
        hasParam("payloadId") && (
          <AccountSelectSingleDrawer
            payloadId={params.payloadId!}
            payload={state.payload!}
            returnToDrawer={state.returnToDrawer!}
            returnToDrawerId={state.returnToDrawerId!}
          />
        )}
      {is(DRAWER_ROUTES.SELECT_SINGLE_CATEGORY) &&
        hasState("payload") &&
        hasState("returnToDrawer") &&
        hasParam("payloadId") && (
          <CategorySelectSingleDrawer
            payloadId={params.payloadId!}
            payload={state.payload!}
            returnToDrawer={state.returnToDrawer!}
            returnToDrawerId={state.returnToDrawerId!}
          />
        )}
    </Drawer>
  );
};
