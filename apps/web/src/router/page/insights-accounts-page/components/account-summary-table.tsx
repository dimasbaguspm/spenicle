import { formatPrice, PriceFormat } from "@/lib/format-price";
import type { InsightsAccountsModel } from "@/types/schemas";
import { cx } from "class-variance-authority";

interface AccountSummaryTableProps {
  accountData: InsightsAccountsModel["data"];
  isLoading?: boolean;
}

export const AccountSummaryTable = ({
  accountData,
  isLoading,
}: AccountSummaryTableProps) => {
  if (isLoading) {
    return (
      <div className="bg-white rounded-lg p-6 shadow-sm border border-gray-200">
        <div className="animate-pulse space-y-4">
          <div className="h-6 bg-gray-200 rounded w-1/3" />
          <div className="h-32 bg-gray-200 rounded" />
        </div>
      </div>
    );
  }

  // Group accounts by type
  const groupedAccounts = (accountData ?? []).reduce((acc, account) => {
    const type = account.accountType || "Other";
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
    <div className="bg-white rounded-lg p-6 shadow-sm border border-gray-200">
      <div className="mb-4">
        <h3 className="text-lg font-semibold text-gray-900">
          Account Summary by Type
        </h3>
        <p className="text-sm text-gray-500 mt-1">
          Monthly breakdown excluding transfers
        </p>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-200">
              <th className="text-left py-3 px-4 font-semibold text-gray-700">
                Account
              </th>
              <th className="text-right py-3 px-4 font-semibold text-gray-700">
                Income
              </th>
              <th className="text-right py-3 px-4 font-semibold text-gray-700">
                Expense
              </th>
              <th className="text-right py-3 px-4 font-semibold text-gray-700">
                Count
              </th>
              <th className="text-right py-3 px-4 font-semibold text-gray-700">
                Net
              </th>
            </tr>
          </thead>
          <tbody>
            {Object.entries(groupedAccounts).map(([type, accounts]) => {
              const typeTotals = calculateTotals(accounts);

              return (
                <React.Fragment key={type}>
                  <tr className="bg-gray-50">
                    <td
                      colSpan={5}
                      className="py-2 px-4 font-semibold text-gray-800 text-xs uppercase"
                    >
                      {type}
                    </td>
                  </tr>
                  {accounts?.map((account, idx) => {
                    const net = account.net ?? 0;
                    return (
                      <tr
                        key={`${account.accountId}-${idx}`}
                        className="border-b border-gray-100 hover:bg-gray-50"
                      >
                        <td className="py-3 px-4 pl-8">
                          <div className="flex items-center space-x-2">
                            <span className="w-3 h-3 rounded-full bg-primary" />
                            <span className="font-medium text-gray-700">
                              {account.accountName}
                            </span>
                          </div>
                        </td>
                        <td className="text-right py-3 px-4 text-green-600">
                          {formatPrice(
                            account.incomeAmount ?? 0,
                            PriceFormat.CURRENCY
                          )}
                        </td>
                        <td className="text-right py-3 px-4 text-red-600">
                          {formatPrice(
                            Math.abs(account.expenseAmount ?? 0),
                            PriceFormat.CURRENCY
                          )}
                        </td>
                        <td className="text-right py-3 px-4 text-gray-700 font-medium">
                          {account.totalCount ?? 0} txns
                        </td>
                        <td
                          className={cx(
                            "text-right py-3 px-4 font-medium",
                            net >= 0 ? "text-green-600" : "text-red-600"
                          )}
                        >
                          {formatPrice(net, PriceFormat.CURRENCY)}
                        </td>
                      </tr>
                    );
                  })}
                  <tr className="bg-gray-50 font-semibold">
                    <td className="py-2 px-4 pl-8 text-sm text-gray-700">
                      {type} Subtotal
                    </td>
                    <td className="text-right py-2 px-4 text-green-600 text-sm">
                      {formatPrice(typeTotals.income, PriceFormat.CURRENCY)}
                    </td>
                    <td className="text-right py-2 px-4 text-red-600 text-sm">
                      {formatPrice(typeTotals.expense, PriceFormat.CURRENCY)}
                    </td>
                    <td className="text-right py-2 px-4 text-gray-700 text-sm">
                      —
                    </td>
                    <td
                      className={cx(
                        "text-right py-2 px-4 text-sm",
                        typeTotals.net >= 0 ? "text-green-600" : "text-red-600"
                      )}
                    >
                      {formatPrice(typeTotals.net, PriceFormat.CURRENCY)}
                    </td>
                  </tr>
                </React.Fragment>
              );
            })}
            <tr className="bg-primary text-white font-bold">
              <td className="py-3 px-4 text-sm">Grand Total</td>
              <td className="text-right py-3 px-4 text-sm">
                {formatPrice(grandTotals.income, PriceFormat.CURRENCY)}
              </td>
              <td className="text-right py-3 px-4 text-sm">
                {formatPrice(grandTotals.expense, PriceFormat.CURRENCY)}
              </td>
              <td className="text-right py-3 px-4 text-sm">—</td>
              <td className="text-right py-3 px-4 text-sm">
                {formatPrice(grandTotals.net, PriceFormat.CURRENCY)}
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
};

// Add React import
import React from "react";
