import type { DrawerId } from '../../constants/drawer-id';

export type DrawerDispatchEventType = 'open' | 'close' | 'submit';

export interface DrawerContextType {
  drawerId: string | null;
  openDrawer: <Data extends object>(drawerId: DrawerId, data?: Data) => Promise<void>;
  closeDrawer: () => void;
  handleDispatchSubmitDrawerEvent: () => void;
  dispatchEl: React.RefObject<HTMLDivElement | null>;
}
