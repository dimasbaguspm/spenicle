import { createFileRoute } from '@tanstack/react-router';

import { PageLayout, Tile } from '../../../../components';
import { CategoriesList, CategoriesListHeader } from '../../../../modules/category-module';

export const Route = createFileRoute('/_protected/_experienced-user/settings/categories')({
  component: CategoriesComponent,
});

function CategoriesComponent() {
  return (
    <PageLayout background="cream" title="Categories" showBackButton={true}>
      <div className="space-y-6">
        <Tile>
          <CategoriesListHeader />
          <CategoriesList />
        </Tile>
      </div>
    </PageLayout>
  );
}
