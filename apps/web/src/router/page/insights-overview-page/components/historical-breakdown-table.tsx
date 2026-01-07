import { formatPrice, PriceFormat } from "@/lib/format-price";
import type { InsightsTransactionModel } from "@/types/schemas";
import dayjs from "dayjs";
import { useMemo } from "react";

interface HistoricalBreakdownTableProps {
  transactionData: InsightsTransactionModel["data"];
  isLoading?: boolean;
}

export const HistoricalBreakdownTable = ({
  transactionData,
  isLoading,
}: HistoricalBreakdownTableProps) => {
  const { tableData, periodLabel } = useMemo(() => {
    if (!Array.isArray(transactionData) || transactionData.length === 0) {
      return { tableData: [], periodLabel: "Period" };
    }

    // Determine format based on date difference and data points
    const firstItem = transactionData[0];
    const lastItem = transactionData[transactionData.length - 1];

    if (!firstItem?.period || !lastItem?.period) {
      return { tableData: [], periodLabel: "Period" };
    }

    const firstDate = dayjs(firstItem.period);
    const lastDate = dayjs(lastItem.period);
    const daysDiff = lastDate.diff(firstDate, "days");

    let format = "MMM DD, YYYY";
    let label = "Period";

    if (daysDiff <= 7) {
      format = "MMM DD, YYYY";
      label = "Day";
    } else if (daysDiff <= 60) {
      format = "MMM DD";
      label = "Week";
    } else if (daysDiff <= 365) {
      format = "MMM DD";
      label = "Week";
    } else {
      format = "MMM YYYY";
      label = "Month";
    }

    const data = transactionData
      .map((item) => ({
        period: dayjs(item.period).format(format),
        date: item.period,
        income: item.incomeAmount ?? 0,
        expense: Math.abs(item.expenseAmount ?? 0),
        transfer: Math.abs(item.transferAmount ?? 0),
        net: item.net ?? 0,
      }))
      .sort((a, b) => dayjs(a.date).unix() - dayjs(b.date).unix());

    return { tableData: data, periodLabel: label };
  }, [transactionData]);

  const totals = useMemo(() => {
    return tableData.reduce(
      (acc, row) => ({
        income: acc.income + row.income,
        expense: acc.expense + row.expense,
        transfer: acc.transfer + row.transfer,
        net: acc.net + row.net,
      }),
      { income: 0, expense: 0, transfer: 0, net: 0 }
    );
  }, [tableData]);

  if (isLoading) {
    return (
      <div className="bg-white rounded-lg p-6 shadow-sm border border-gray-200">
        <div className="animate-pulse space-y-4">
          <div className="h-6 bg-gray-200 rounded w-1/3" />
          <div className="h-64 bg-gray-200 rounded" />
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg p-6 shadow-sm border border-gray-200">
      <div className="mb-4">
        <h3 className="text-lg font-semibold text-gray-900">
          Historical Breakdown
        </h3>
        <p className="text-sm text-gray-500 mt-1">
          Income and expense breakdown by period
        </p>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-200">
              <th className="text-left py-3 px-4 font-semibold text-gray-700">
                {periodLabel}
              </th>
              <th className="text-right py-3 px-4 font-semibold text-gray-700">
                Income
              </th>
              <th className="text-right py-3 px-4 font-semibold text-gray-700">
                Expense
              </th>
              <th className="text-right py-3 px-4 font-semibold text-gray-700">
                Transfer
              </th>
              <th className="text-right py-3 px-4 font-semibold text-gray-700">
                Net
              </th>
            </tr>
          </thead>
          <tbody>
            {tableData.map((row, idx) => (
              <tr
                key={`${row.date}-${idx}`}
                className="border-b border-gray-100 hover:bg-gray-50"
              >
                <td className="py-3 px-4 font-medium text-gray-700">
                  {row.period}
                </td>
                <td className="text-right py-3 px-4 text-green-600">
                  {formatPrice(row.income, PriceFormat.CURRENCY)}
                </td>
                <td className="text-right py-3 px-4 text-red-600">
                  {formatPrice(row.expense, PriceFormat.CURRENCY)}
                </td>
                <td className="text-right py-3 px-4 text-blue-600">
                  {formatPrice(row.transfer, PriceFormat.CURRENCY)}
                </td>
                <td
                  className={`text-right py-3 px-4 font-semibold ${
                    row.net >= 0 ? "text-green-600" : "text-red-600"
                  }`}
                >
                  {formatPrice(row.net, PriceFormat.CURRENCY)}
                </td>
              </tr>
            ))}
            <tr className="bg-primary text-white font-bold">
              <td className="py-3 px-4 text-sm">Total</td>
              <td className="text-right py-3 px-4 text-sm">
                {formatPrice(totals.income, PriceFormat.CURRENCY)}
              </td>
              <td className="text-right py-3 px-4 text-sm">
                {formatPrice(totals.expense, PriceFormat.CURRENCY)}
              </td>
              <td className="text-right py-3 px-4 text-sm">
                {formatPrice(totals.transfer, PriceFormat.CURRENCY)}
              </td>
              <td className="text-right py-3 px-4 text-sm">
                {formatPrice(totals.net, PriceFormat.CURRENCY)}
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
};
