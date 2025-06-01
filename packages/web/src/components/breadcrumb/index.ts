import { Breadcrumb as BaseBreadcrumb } from './breadcrumb';
import { BreadcrumbItem } from './breadcrumb-item';
import { BreadcrumbLink } from './breadcrumb-link';
import { BreadcrumbPage } from './breadcrumb-page';
import { BreadcrumbSeparator } from './breadcrumb-separator';

type BreadcrumbCompositionModel = {
  Item: typeof BreadcrumbItem;
  Link: typeof BreadcrumbLink;
  Page: typeof BreadcrumbPage;
  Separator: typeof BreadcrumbSeparator;
};

const BreadcrumbComposition = {
  Item: BreadcrumbItem,
  Link: BreadcrumbLink,
  Page: BreadcrumbPage,
  Separator: BreadcrumbSeparator,
} satisfies BreadcrumbCompositionModel;

export const Breadcrumb = Object.assign(BaseBreadcrumb, BreadcrumbComposition);

export type { BreadcrumbProps } from './breadcrumb';
export type { BreadcrumbItemProps } from './breadcrumb-item';
export type { BreadcrumbLinkProps } from './breadcrumb-link';
export type { BreadcrumbPageProps } from './breadcrumb-page';
export type { BreadcrumbSeparatorProps } from './breadcrumb-separator';
