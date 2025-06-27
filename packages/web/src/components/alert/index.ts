import { Alert as BaseAlert } from './alert';
import { AlertCloseButton } from './components/alert-close-button';
import { AlertContent } from './components/alert-content';
import { AlertDescription } from './components/alert-description';
import { AlertIcon } from './components/alert-icon';
import { AlertTitle } from './components/alert-title';

type AlertCompositionModel = {
  Title: typeof AlertTitle;
  Description: typeof AlertDescription;
  Content: typeof AlertContent;
  Icon: typeof AlertIcon;
  CloseButton: typeof AlertCloseButton;
};

const AlertComposition = {
  Title: AlertTitle,
  Description: AlertDescription,
  Content: AlertContent,
  Icon: AlertIcon,
  CloseButton: AlertCloseButton,
} satisfies AlertCompositionModel;

export const Alert = Object.assign(BaseAlert, AlertComposition);

// export types from types.ts file
export type {
  AlertProps,
  AlertTitleProps,
  AlertDescriptionProps,
  AlertContentProps,
  AlertIconProps,
  AlertCloseButtonProps,
} from './types';
