import { Breadcrumb as BaseBreadcrumb } from './breadcrumb';
import { BreadcrumbItem } from './components/breadcrumb-item';
import { BreadcrumbLink } from './components/breadcrumb-link';
import { BreadcrumbPage } from './components/breadcrumb-page';
import { BreadcrumbSeparator } from './components/breadcrumb-separator';

/**
 * compound breadcrumb component with subcomponents
 * usage: <Breadcrumb><Breadcrumb.Item>...</Breadcrumb.Item></Breadcrumb>
 */
type BreadcrumbComposition = typeof BaseBreadcrumb & {
  Item: typeof BreadcrumbItem;
  Link: typeof BreadcrumbLink;
  Page: typeof BreadcrumbPage;
  Separator: typeof BreadcrumbSeparator;
};

const BreadcrumbCompositionObject = {
  Item: BreadcrumbItem,
  Link: BreadcrumbLink,
  Page: BreadcrumbPage,
  Separator: BreadcrumbSeparator,
};

export const Breadcrumb = Object.assign(BaseBreadcrumb, BreadcrumbCompositionObject) as BreadcrumbComposition;

// export types for external use
export type {
  BreadcrumbProps,
  BreadcrumbItemProps,
  BreadcrumbLinkProps,
  BreadcrumbPageProps,
  BreadcrumbSeparatorProps,
} from './types';
