import { formatPrice, PriceFormat } from "@/lib/format-price";
import type { InsightsAccountsModel } from "@/types/schemas";
import { Heading, Tile } from "@dimasbaguspm/versaur";
import { startCase } from "lodash";
import React from "react";

const formatAccountingValue = (value: number): string => {
  const absValue = Math.abs(value);
  const formatted = formatPrice(absValue, PriceFormat.CURRENCY);
  return value < 0 ? `(${formatted})` : formatted;
};

interface AccountSummaryTableProps {
  accountData: InsightsAccountsModel["data"];
}

export const AccountSummaryTable = ({
  accountData,
}: AccountSummaryTableProps) => {
  // Group accounts by type
  const groupedAccounts = (accountData ?? []).reduce((acc, account) => {
    const type = account.accountType;
    if (!acc[type]) {
      acc[type] = [];
    }
    acc[type].push(account);
    return acc;
  }, {} as Record<string, typeof accountData>);

  const calculateTotals = (accounts: typeof accountData) => {
    if (!accounts) return { income: 0, expense: 0, net: 0 };
    return accounts.reduce(
      (totals, account) => {
        totals.income += account.incomeAmount ?? 0;
        totals.expense += Math.abs(account.expenseAmount ?? 0);
        totals.net += account.net ?? 0;
        return totals;
      },
      { income: 0, expense: 0, net: 0 }
    );
  };

  const grandTotals = calculateTotals(accountData ?? []);

  return (
    <div className="overflow-x-auto">
      <table className="w-full">
        <thead>
          <tr className="bg-gray-50 border-b border-gray-200">
            <th className="text-left py-3 px-3 sm:px-4 text-xs sm:text-sm font-semibold text-gray-700 whitespace-nowrap">
              Account
            </th>
            <th className="text-right py-3 px-2 sm:px-4 text-xs sm:text-sm font-semibold text-gray-700 whitespace-nowrap">
              Income
            </th>
            <th className="text-right py-3 px-2 sm:px-4 text-xs sm:text-sm font-semibold text-gray-700 whitespace-nowrap">
              Expense
            </th>
            <th className="text-right py-3 px-2 sm:px-4 text-xs sm:text-sm font-semibold text-gray-700 whitespace-nowrap">
              Count
            </th>
            <th className="text-right py-3 px-3 sm:px-4 text-xs sm:text-sm font-semibold text-gray-700 whitespace-nowrap">
              Net
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {Object.entries(groupedAccounts).map(([type, accounts]) => {
            const typeTotals = calculateTotals(accounts);

            return (
              <React.Fragment key={type}>
                <tr className="bg-gray-50">
                  <td
                    colSpan={5}
                    className="py-2 px-3 sm:px-4 font-semibold text-gray-800 text-xs uppercase"
                  >
                    {type}
                  </td>
                </tr>
                {accounts?.map((account, idx) => {
                  return (
                    <tr
                      key={`${account.accountId}-${idx}`}
                      className="bg-white"
                    >
                      <td className="py-3 px-3 sm:px-4 sm:pl-8">
                        <div className="flex items-center space-x-2">
                          <span className="size-1.5 rounded-full bg-primary flex-shrink-0" />
                          <span className="text-xs sm:text-sm font-medium text-gray-900">
                            {account.accountName}
                          </span>
                        </div>
                      </td>
                      <td className="text-right py-3 px-2 sm:px-4 text-xs sm:text-sm tabular-nums text-gray-900">
                        {formatPrice(
                          account.incomeAmount ?? 0,
                          PriceFormat.CURRENCY
                        )}
                      </td>
                      <td className="text-right py-3 px-2 sm:px-4 text-xs sm:text-sm tabular-nums text-gray-900">
                        {formatAccountingValue(-(account.expenseAmount ?? 0))}
                      </td>
                      <td className="text-right py-3 px-2 sm:px-4 text-xs sm:text-sm text-gray-700">
                        {account.totalCount ?? 0}
                      </td>
                      <td className="text-right py-3 px-3 sm:px-4 text-xs sm:text-sm font-medium tabular-nums text-gray-900">
                        {formatAccountingValue(account.net ?? 0)}
                      </td>
                    </tr>
                  );
                })}
                <tr className="bg-gray-50">
                  <td className="py-2 px-3 sm:px-4 sm:pl-8 text-xs sm:text-sm font-semibold text-gray-900">
                    {startCase(type)} Subtotal
                  </td>
                  <td className="text-right py-2 px-2 sm:px-4 text-xs sm:text-sm font-semibold tabular-nums text-gray-900">
                    {formatPrice(typeTotals.income, PriceFormat.CURRENCY)}
                  </td>
                  <td className="text-right py-2 px-2 sm:px-4 text-xs sm:text-sm font-semibold tabular-nums text-gray-900">
                    {formatAccountingValue(-typeTotals.expense)}
                  </td>
                  <td className="text-right py-2 px-2 sm:px-4 text-xs sm:text-sm text-gray-700">
                    —
                  </td>
                  <td className="text-right py-2 px-3 sm:px-4 text-xs sm:text-sm font-semibold tabular-nums text-gray-900">
                    {formatAccountingValue(typeTotals.net)}
                  </td>
                </tr>
              </React.Fragment>
            );
          })}
        </tbody>
        <tfoot>
          <tr className="border-t-2 border-orange-200">
            <td className="py-3 px-3 sm:px-4 text-xs sm:text-sm font-bold text-gray-900">
              Grand Total
            </td>
            <td className="text-right py-3 px-2 sm:px-4 text-xs sm:text-sm font-bold tabular-nums text-gray-900">
              {formatPrice(grandTotals.income, PriceFormat.CURRENCY)}
            </td>
            <td className="text-right py-3 px-2 sm:px-4 text-xs sm:text-sm font-bold tabular-nums text-gray-900">
              {formatAccountingValue(-grandTotals.expense)}
            </td>
            <td className="text-right py-3 px-2 sm:px-4 text-xs sm:text-sm text-gray-700">
              —
            </td>
            <td className="text-right py-3 px-3 sm:px-4 text-xs sm:text-sm font-bold tabular-nums text-gray-900">
              {formatAccountingValue(grandTotals.net)}
            </td>
          </tr>
        </tfoot>
      </table>
    </div>
  );
};
