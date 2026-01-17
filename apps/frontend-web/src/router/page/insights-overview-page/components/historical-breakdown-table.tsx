import { formatDate, DateFormat } from "@/lib/format-date";
import { formatPrice, PriceFormat } from "@/lib/format-price";
import type { InsightsTransactionModel } from "@/types/schemas";
import { Heading } from "@dimasbaguspm/versaur";
import dayjs from "dayjs";
import isoWeek from "dayjs/plugin/isoWeek";
import { useMemo } from "react";

// Configure dayjs plugins
dayjs.extend(isoWeek);

interface HistoricalBreakdownTableProps {
  transactionData: InsightsTransactionModel["data"];
  frequency?: InsightsTransactionModel["frequency"];
  isLoading?: boolean;
}

type FrequencyType = "daily" | "weekly" | "monthly" | "yearly";

type PeriodFormat = {
  dateFormat: (typeof DateFormat)[keyof typeof DateFormat];
  label: string;
  formatFn?: (period: string) => string;
};

interface ProcessedRow {
  period: string;
  date: string;
  income: number;
  expense: number;
  transfer: number;
  net: number;
}

interface Totals {
  income: number;
  expense: number;
  transfer: number;
  net: number;
}

/**
 * Pure function to format weekly period as date range
 * Input: "2025-W01" -> Output: "30 Dec 2024 - 5 Jan 2025"
 */
const formatWeeklyPeriod = (period: string): string => {
  // Parse ISO week format (YYYY-Www)
  const [year, week] = period.split("-W");
  if (!year || !week) return period;

  // Get the start of the ISO week (Monday)
  const startOfWeek = dayjs()
    .year(Number.parseInt(year))
    .isoWeek(Number.parseInt(week))
    .startOf("isoWeek");

  const endOfWeek = startOfWeek.endOf("isoWeek");

  const startMonth = formatDate(startOfWeek.toDate(), DateFormat.SHORT_MONTH);
  const endMonth = formatDate(endOfWeek.toDate(), DateFormat.SHORT_MONTH);
  const startYear = startOfWeek.year();
  const endYear = endOfWeek.year();

  // Same month and year
  if (startMonth === endMonth && startYear === endYear) {
    return `${startOfWeek.date()} - ${endOfWeek.date()} ${startMonth} ${startYear}`;
  }

  // Different months, same year
  if (startYear === endYear) {
    return `${startOfWeek.date()} ${startMonth} - ${endOfWeek.date()} ${endMonth} ${endYear}`;
  }

  // Different years
  return `${startOfWeek.date()} ${startMonth} ${startYear} - ${endOfWeek.date()} ${endMonth} ${endYear}`;
};

/**
 * Pure function to format monthly period as month and year
 * Input: "2024-12" -> Output: "Dec 2024"
 */
const formatMonthlyPeriod = (period: string): string => {
  // Parse YYYY-MM format
  const parsed = dayjs(period, "YYYY-MM");
  if (!parsed.isValid()) return period;

  return formatDate(parsed.toDate(), DateFormat.SHORT_MONTH_YEAR);
};

/**
 * Pure function to determine the appropriate date format and label based on frequency
 */
const determinePeriodFormat = (frequency?: string): PeriodFormat => {
  const freq = (frequency?.toLowerCase() || "monthly") as FrequencyType;

  switch (freq) {
    case "daily":
      // For daily, period is "2024-12-31" - show as "1 Jan 2026"
      return {
        dateFormat: DateFormat.DAY_MONTH_YEAR,
        label: "Day",
      };
    case "weekly":
      // For weekly, period is "2025-W01" - show week range "1 - 7 Jan 2025"
      return {
        dateFormat: DateFormat.DAY_MONTH_YEAR,
        label: "Week",
        formatFn: formatWeeklyPeriod,
      };
    case "monthly":
      // For monthly, period is "2024-12" - show as "Dec 2024"
      return {
        dateFormat: DateFormat.SHORT_MONTH_YEAR,
        label: "Month",
        formatFn: formatMonthlyPeriod,
      };
    case "yearly":
      // For yearly, period is "2024" - show as "2024"
      return {
        dateFormat: DateFormat.YEAR,
        label: "Year",
      };
    default:
      return {
        dateFormat: DateFormat.MEDIUM_DATE,
        label: "Period",
      };
  }
};

/**
 * Pure function to process raw transaction data into table rows
 */
const processTransactionData = (
  data: InsightsTransactionModel["data"],
  periodFormat: PeriodFormat,
): ProcessedRow[] => {
  return (data || [])
    .map((item) => {
      const formattedPeriod = periodFormat.formatFn
        ? periodFormat.formatFn(item.period)
        : formatDate(item.period, periodFormat.dateFormat);

      return {
        period: formattedPeriod,
        date: item.period,
        income: item.incomeAmount ?? 0,
        expense: Math.abs(item.expenseAmount ?? 0),
        transfer: Math.abs(item.transferAmount ?? 0),
        net: item.net ?? 0,
      };
    })
    .sort((a, b) => dayjs(a.date).unix() - dayjs(b.date).unix());
};

/**
 * Pure function to calculate totals from table data
 */
const calculateTotals = (tableData: ProcessedRow[]): Totals => {
  return tableData.reduce(
    (acc, row) => ({
      income: acc.income + row.income,
      expense: acc.expense + row.expense,
      transfer: acc.transfer + row.transfer,
      net: acc.net + row.net,
    }),
    { income: 0, expense: 0, transfer: 0, net: 0 },
  );
};

/**
 * Pure function to format accounting values with parentheses for negatives
 */
const formatAccountingValue = (value: number): string => {
  const absValue = Math.abs(value);
  const formatted = formatPrice(absValue, PriceFormat.CURRENCY_NO_DECIMALS);
  return value < 0 ? `(${formatted})` : formatted;
};

export const HistoricalBreakdownTable = ({
  transactionData,
  frequency,
}: HistoricalBreakdownTableProps) => {
  const { tableData, periodLabel } = useMemo(() => {
    if (!Array.isArray(transactionData) || transactionData.length === 0) {
      return { tableData: [], periodLabel: "Period" };
    }

    const periodFormat = determinePeriodFormat(frequency);
    const data = processTransactionData(transactionData, periodFormat);

    return { tableData: data, periodLabel: periodFormat.label };
  }, [transactionData, frequency]);

  const totals = useMemo(() => calculateTotals(tableData), [tableData]);

  return (
    <div>
      <div className="mb-4">
        <Heading as="h5">Historical Breakdown</Heading>
        <p className="text-xs sm:text-sm text-gray-500 mt-1">
          Income and expense breakdown by period
        </p>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="bg-gray-50 border-b border-gray-200">
              <th className="text-left py-3 px-3 sm:px-4 text-xs sm:text-sm font-semibold text-gray-700 whitespace-nowrap">
                {periodLabel}
              </th>
              <th className="text-right py-3 px-2 sm:px-4 text-xs sm:text-sm font-semibold text-gray-700 whitespace-nowrap">
                Income
              </th>
              <th className="text-right py-3 px-2 sm:px-4 text-xs sm:text-sm font-semibold text-gray-700 whitespace-nowrap">
                Expense
              </th>
              <th className="text-right py-3 px-2 sm:px-4 text-xs sm:text-sm font-semibold text-gray-700 whitespace-nowrap">
                Transfer
              </th>
              <th className="text-right py-3 px-3 sm:px-4 text-xs sm:text-sm font-semibold text-gray-700 whitespace-nowrap">
                Net
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {tableData.map((row, idx) => (
              <tr key={`${row.date}-${idx}`} className="bg-white">
                <td className="py-3 px-3 sm:px-4 text-xs sm:text-sm font-medium text-gray-900 whitespace-nowrap">
                  {row.period}
                </td>
                <td className="text-right py-3 px-2 sm:px-4 text-xs sm:text-sm tabular-nums text-gray-900">
                  {formatPrice(row.income, PriceFormat.CURRENCY_NO_DECIMALS)}
                </td>
                <td className="text-right py-3 px-2 sm:px-4 text-xs sm:text-sm tabular-nums text-gray-900">
                  {formatAccountingValue(-row.expense)}
                </td>
                <td className="text-right py-3 px-2 sm:px-4 text-xs sm:text-sm tabular-nums text-gray-900">
                  {formatAccountingValue(-row.transfer)}
                </td>
                <td className="text-right py-3 px-3 sm:px-4 text-xs sm:text-sm font-medium tabular-nums text-gray-900">
                  {formatAccountingValue(row.net)}
                </td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr className="border-t-2 border-orange-200">
              <td className="py-3 px-3 sm:px-4 text-xs sm:text-sm font-bold text-gray-900">
                Total
              </td>
              <td className="text-right py-3 px-2 sm:px-4 text-xs sm:text-sm font-bold tabular-nums text-gray-900">
                {formatPrice(totals.income, PriceFormat.CURRENCY_NO_DECIMALS)}
              </td>
              <td className="text-right py-3 px-2 sm:px-4 text-xs sm:text-sm font-bold tabular-nums text-gray-900">
                {formatAccountingValue(-totals.expense)}
              </td>
              <td className="text-right py-3 px-2 sm:px-4 text-xs sm:text-sm font-bold tabular-nums text-gray-900">
                {formatAccountingValue(-totals.transfer)}
              </td>
              <td className="text-right py-3 px-3 sm:px-4 text-xs sm:text-sm font-bold tabular-nums text-gray-900">
                {formatAccountingValue(totals.net)}
              </td>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  );
};
