import { createFileRoute } from '@tanstack/react-router';
import { useState } from 'react';

import { Expense } from '../../../../modules/summary-module';

export const Route = createFileRoute('/_protected/_experienced-user/analytics/expenses')({
  component: RouteComponent,
});

function RouteComponent() {
  const [categoriesPeriodType, setCategoriesPeriodType] = useState<'weekly' | 'monthly' | 'yearly'>('monthly');
  const [categoriesIndex, setCategoriesIndex] = useState(0);

  const handleCategoriesPeriodType = (type: 'weekly' | 'monthly' | 'yearly') => {
    setCategoriesPeriodType(type);
    setCategoriesIndex(0);
  };

  return (
    <Expense
      periodType={categoriesPeriodType}
      periodIndex={categoriesIndex}
      setPeriodType={handleCategoriesPeriodType}
      setPeriodIndex={setCategoriesIndex}
    />
  );
}
