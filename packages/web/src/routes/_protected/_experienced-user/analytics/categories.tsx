import { createFileRoute } from '@tanstack/react-router';

import { useViewport } from '../../../../hooks';
import { DesktopCategoriesPage, MobileCategoriesPage } from '../../../../modules/summary-module';

export const Route = createFileRoute('/_protected/_experienced-user/analytics/categories')({
  component: RouteComponent,
});

function RouteComponent() {
  const { isDesktop } = useViewport();

  if (isDesktop) return <DesktopCategoriesPage />;
  return <MobileCategoriesPage />;
}
