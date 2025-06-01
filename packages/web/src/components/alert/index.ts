import { Alert as BaseAlert } from './alert';
import { AlertCloseButton } from './alert-close-button';
import { AlertContent } from './alert-content';
import { AlertDescription } from './alert-description';
import { AlertIcon } from './alert-icon';
import { AlertTitle } from './alert-title';

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

export type { AlertProps } from './alert';
export type { AlertTitleProps } from './alert-title';
export type { AlertDescriptionProps } from './alert-description';
export type { AlertContentProps } from './alert-content';
export type { AlertIconProps } from './alert-icon';
export type { AlertCloseButtonProps } from './alert-close-button';
