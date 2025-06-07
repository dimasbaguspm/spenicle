import { createFileRoute } from '@tanstack/react-router';
import { useState } from 'react';

import { Categories } from '../../../../modules/summary-module';

export const Route = createFileRoute('/_protected/_experienced-user/analytics/categories')({
  component: RouteComponent,
});

function RouteComponent() {
  const [categoriesPeriodType, setCategoriesPeriodType] = useState<'weekly' | 'monthly' | 'yearly'>('weekly');
  const [categoriesIndex, setCategoriesIndex] = useState(0);

  const handleCategoriesPeriodType = (type: 'weekly' | 'monthly' | 'yearly') => {
    setCategoriesPeriodType(type);
    setCategoriesIndex(0);
  };

  return (
    <Categories
      periodType={categoriesPeriodType}
      periodIndex={categoriesIndex}
      setPeriodType={handleCategoriesPeriodType}
      setPeriodIndex={setCategoriesIndex}
    />
  );
}
