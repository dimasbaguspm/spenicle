import { useNavigate } from "react-router";
import { PAGE_HANDLES } from "@/constant/page-handles";
import type { FloatingActionItem } from "./types";
import { useDrawerProvider } from "@/providers/drawer-provider";
import { useModalProvider } from "@/providers/modal-provider";
import { useBottomSheetProvider } from "@/providers/bottom-sheet-provider";

/**
 * Hook to handle floating action button clicks
 * Routes to appropriate provider based on action type
 */
export const useFloatingActionHandler = () => {
  const navigate = useNavigate();
  const { openDrawer } = useDrawerProvider();
  const { openModal } = useModalProvider();
  const { openBottomSheet } = useBottomSheetProvider();

  const handleAction = (action: FloatingActionItem) => {
    switch (action.type) {
      case PAGE_HANDLES.PAGE:
        navigate(action.link);
        break;

      case PAGE_HANDLES.DRAWER:
        openDrawer(action.link);
        break;

      case PAGE_HANDLES.MODAL:
        openModal(action.link);
        break;

      case PAGE_HANDLES.BOTTOM_SHEET:
        openBottomSheet(action.link);
        break;

      default:
        console.warn(`Unknown action type: ${action.type}`);
    }
  };

  return { handleAction };
};
