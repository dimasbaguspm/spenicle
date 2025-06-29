import { createFileRoute, redirect } from '@tanstack/react-router';
import { z } from 'zod';

import { useViewport } from '../../../../hooks';
import {
  DesktopSummaryDashboardPageComponent,
  MobileSummaryDashboardPageComponent,
} from '../../../../modules/summary-module';

// search schema for analytics routes
const analyticsSearchSchema = z.object({
  periodType: z.enum(['weekly', 'monthly', 'yearly']).optional(),
  periodIndex: z.number().optional(),
  query: z.string().optional(),
  categories: z.array(z.string()).optional(),
  accounts: z.array(z.string()).optional(),
  minAmount: z.number().optional(),
  maxAmount: z.number().optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
});

export const Route = createFileRoute('/_protected/_experienced-user/analytics')({
  validateSearch: analyticsSearchSchema,
  beforeLoad: (c) => {
    const location = c.location.pathname;
    if (location === '/analytics') {
      throw redirect({
        to: '/analytics/period-breakdown',
        replace: true,
      });
    }
  },
  component: () => {
    const { isDesktop } = useViewport();

    if (isDesktop) return <DesktopSummaryDashboardPageComponent />;
    return <MobileSummaryDashboardPageComponent />;
  },
});
