import type { SummaryTransactionsPeriod } from '../../../../../types/api';

export type EnrichedPeriodData = SummaryTransactionsPeriod[number] & {
  label?: string;
  transactionCount?: number;
};
