import { createFileRoute } from '@tanstack/react-router';

import { useViewport } from '../../../../hooks';
import { DesktopCategoryDashboardPage, MobileCategoryDashboardPage } from '../../../../modules/category-module';

export const Route = createFileRoute('/_protected/_experienced-user/categories/')({
  component: CategoriesComponent,
});

function CategoriesComponent() {
  const { isDesktop } = useViewport();

  if (isDesktop) return <DesktopCategoryDashboardPage />;
  return <MobileCategoryDashboardPage />;
}
