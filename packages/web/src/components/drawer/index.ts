import { Drawer as BaseDrawer } from './drawer';
import { DrawerCloseButton } from './drawer-close-button';
import { DrawerContent } from './drawer-content';
import { DrawerDescription } from './drawer-description';
import { DrawerFooter } from './drawer-footer';
import { DrawerHeader } from './drawer-header';
import { DrawerTitle } from './drawer-title';

type DrawerCompositionModel = {
  Header: typeof DrawerHeader;
  Title: typeof DrawerTitle;
  Description: typeof DrawerDescription;
  Content: typeof DrawerContent;
  Footer: typeof DrawerFooter;
  CloseButton: typeof DrawerCloseButton;
};

const DrawerComposition = {
  Header: DrawerHeader,
  Title: DrawerTitle,
  Description: DrawerDescription,
  Content: DrawerContent,
  Footer: DrawerFooter,
  CloseButton: DrawerCloseButton,
} satisfies DrawerCompositionModel;

export const Drawer = Object.assign(BaseDrawer, DrawerComposition);

export type { DrawerProps } from './drawer';
