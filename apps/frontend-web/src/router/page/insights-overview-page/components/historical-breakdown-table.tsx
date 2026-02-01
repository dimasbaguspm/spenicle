import { formatDate, DateFormat } from "@/lib/format-date";
import { formatPrice, PriceFormat } from "@/lib/format-price";
import type { InsightsTransactionModel } from "@/types/schemas";
import { Text } from "@dimasbaguspm/versaur";
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
    <div className="space-y-6">
      <div className="overflow-x-auto border border-border rounded-lg">
        <table className="w-full">
          <thead className="border-b border-border">
            <tr>
              <th className="text-left py-4 px-4 text-sm font-semibold text-foreground whitespace-nowrap">
                {periodLabel}
              </th>
              <th className="text-left py-4 px-4 text-sm font-semibold text-foreground whitespace-nowrap">
                Income
              </th>
              <th className="text-left py-4 px-4 text-sm font-semibold text-foreground whitespace-nowrap">
                Expense
              </th>
              <th className="text-left py-4 px-4 text-sm font-semibold text-foreground whitespace-nowrap">
                Transfer
              </th>
              <th className="text-left py-4 px-4 text-sm font-semibold text-foreground whitespace-nowrap">
                Net
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {tableData.map((row) => (
              <tr key={row.date}>
                <td className="py-3 px-4 whitespace-nowrap">
                  <Text as="small" color="black">
                    {row.period}
                  </Text>
                </td>
                <td className="py-3 px-4">
                  <Text as="small" color="ghost">
                    {formatPrice(row.income, PriceFormat.CURRENCY_NO_DECIMALS)}
                  </Text>
                </td>
                <td className="py-3 px-4">
                  <Text as="small" color="ghost">
                    (
                    {formatPrice(row.expense, PriceFormat.CURRENCY_NO_DECIMALS)}
                    )
                  </Text>
                </td>
                <td className="py-3 px-4">
                  <Text as="small" color="ghost">
                    (
                    {formatPrice(
                      row.transfer,
                      PriceFormat.CURRENCY_NO_DECIMALS,
                    )}
                    )
                  </Text>
                </td>
                <td className="py-3 px-4">
                  <Text as="small" color="black" fontWeight="medium">
                    {formatPrice(row.net, PriceFormat.CURRENCY_NO_DECIMALS)}
                  </Text>
                </td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr className="border-t border-border">
              <td className="py-4 px-4 text-sm font-bold text-foreground">
                Total
              </td>
              <td className="text-left py-4 px-4 text-sm font-bold ">
                {formatPrice(totals.income, PriceFormat.CURRENCY_NO_DECIMALS)}
              </td>
              <td className="text-left py-4 px-4 text-sm font-bold">
                ({formatPrice(totals.expense, PriceFormat.CURRENCY_NO_DECIMALS)}
                )
              </td>
              <td className="text-left py-4 px-4 text-sm font-bold">
                (
                {formatPrice(totals.transfer, PriceFormat.CURRENCY_NO_DECIMALS)}
                )
              </td>
              <td className={`text-left py-4 px-4 text-sm font-bold`}>
                {formatPrice(totals.net, PriceFormat.CURRENCY_NO_DECIMALS)}
              </td>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  );
};
