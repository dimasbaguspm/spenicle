import { BottomBar as BaseBottomBar } from './bottom-bar';
import { BottomBarAction } from './bottom-bar-action';
import { BottomBarContent } from './bottom-bar-content';
import { BottomBarGroup } from './bottom-bar-group';
import { BottomBarIconButton } from './bottom-bar-icon-button';
import { BottomBarSeparator } from './bottom-bar-separator';

type BottomBarCompositionModel = {
  Content: typeof BottomBarContent;
  Action: typeof BottomBarAction;
  Group: typeof BottomBarGroup;
  IconButton: typeof BottomBarIconButton;
  Separator: typeof BottomBarSeparator;
};

const BottomBarComposition = {
  Content: BottomBarContent,
  Action: BottomBarAction,
  Group: BottomBarGroup,
  IconButton: BottomBarIconButton,
  Separator: BottomBarSeparator,
} satisfies BottomBarCompositionModel;

export const BottomBar = Object.assign(BaseBottomBar, BottomBarComposition);

export type { BottomBarProps } from './bottom-bar';
export type { BottomBarContentProps } from './bottom-bar-content';
export type { BottomBarActionProps } from './bottom-bar-action';
export type { BottomBarGroupProps } from './bottom-bar-group';
export type { BottomBarIconButtonProps } from './bottom-bar-icon-button';
export type { BottomBarSeparatorProps } from './bottom-bar-separator';
