import { BottomBar as BaseBottomBar } from './bottom-bar';
import { BottomBarAction } from './components/bottom-bar-action';
import { BottomBarContent } from './components/bottom-bar-content';
import { BottomBarGroup } from './components/bottom-bar-group';
import { BottomBarIconButton } from './components/bottom-bar-icon-button';
import { BottomBarSeparator } from './components/bottom-bar-separator';

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

// export only main component types from types.ts following standards
export type {
  BottomBarProps,
  BottomBarContextType,
  BottomBarVariant,
  BottomBarActionVariant,
  BottomBarIconVariant,
  BottomBarSeparatorVariant,
  BottomBarSpacing,
  BottomBarVariantConfig,
  BadgeVariant,
  IconButtonVariant,
  IconButtonSize,
  SeparatorVariant,
} from './types';
