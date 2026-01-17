import { BottomSheet } from "@dimasbaguspm/versaur";

import { useBottomSheetProvider } from "@/providers/bottom-sheet-provider";
import { BOTTOM_SHEET_ROUTES } from "@/constant/bottom-sheet-routes";
import { MenuBottomSheet } from "./menu-bottom-sheet/menu-bottom-sheet";

interface BottomSheetParams {
  accountId?: number;
}

interface BottomSheetState {
  payload?: Record<string, string>;
  returnToBottomSheet?: string;
  returnToBottomSheetId?: Record<string, string> | null;
}

export const BottomSheetRouter = () => {
  const { isOpen, bottomSheetId, closeBottomSheet } = useBottomSheetProvider<
    BottomSheetParams,
    BottomSheetState
  >();

  const is = (id: string) => bottomSheetId === id;
  // const hasParam = (param: keyof typeof params) => (params && typeof params === 'object' ? param in params : false);
  // const hasState = (stateKey: keyof typeof state) => (state && typeof state === 'object' ? stateKey in state : false);

  return (
    <BottomSheet isOpen={isOpen} onClose={closeBottomSheet}>
      {is(BOTTOM_SHEET_ROUTES.MENU) && <MenuBottomSheet />}
    </BottomSheet>
  );
};
