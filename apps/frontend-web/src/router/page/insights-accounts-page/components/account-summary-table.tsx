import { formatPrice, PriceFormat } from "@/lib/format-price";
import type { InsightsAccountsModel } from "@/types/schemas";
import { Text } from "@dimasbaguspm/versaur";
import { startCase } from "lodash";
import React from "react";

interface AccountSummaryTableProps {
  accountData: InsightsAccountsModel["data"];
  showPercentage?: boolean;
}

export const AccountSummaryTable = ({
  accountData,
  showPercentage = false,
}: AccountSummaryTableProps) => {
  const formatDisplayValue = (value: number, total: number) => {
    if (showPercentage && total > 0) {
      return ((value / total) * 100).toFixed(1) + "%";
    }
    return formatPrice(value, PriceFormat.CURRENCY_NO_DECIMALS);
  };
  // Group accounts by type
  const groupedAccounts = (accountData ?? []).reduce(
    (acc, account) => {
      const type = account.type;
      if (!acc[type]) {
        acc[type] = [];
      }
      acc[type].push(account);
      return acc;
    },
    {} as Record<string, typeof accountData>,
  );

  const calculateTotals = (accounts: typeof accountData) => {
    if (!accounts) return { income: 0, expense: 0, net: 0 };
    return accounts.reduce(
      (totals, account) => {
        totals.income += account.incomeAmount ?? 0;
        totals.expense += Math.abs(account.expenseAmount ?? 0);
        totals.net += account.net ?? 0;
        return totals;
      },
      { income: 0, expense: 0, net: 0 },
    );
  };

  const grandTotals = calculateTotals(accountData ?? []);

  return (
    <div className="overflow-x-auto border border-border rounded-lg">
      <table className="w-full">
        <thead className="border-b border-border">
          <tr>
            <th className="text-left py-4 px-4 text-sm font-semibold text-foreground whitespace-nowrap">
              Account
            </th>
            <th className="text-left py-4 px-4 text-sm font-semibold text-foreground whitespace-nowrap">
              Income
            </th>
            <th className="text-left py-4 px-4 text-sm font-semibold text-foreground whitespace-nowrap">
              Expense
            </th>
            <th className="text-left py-4 px-4 text-sm font-semibold text-foreground whitespace-nowrap">
              Count
            </th>
            <th className="text-left py-4 px-4 text-sm font-semibold text-foreground whitespace-nowrap">
              Net
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          {Object.entries(groupedAccounts).map(([type, accounts]) => {
            const typeTotals = calculateTotals(accounts);

            return (
              <React.Fragment key={type}>
                {/* Type Header */}
                <tr>
                  <td
                    colSpan={5}
                    className="py-3 px-4 font-semibold text-foreground text-xs uppercase tracking-wide"
                  >
                    {type}
                  </td>
                </tr>

                {/* Account Rows */}
                {accounts?.map((account, idx) => {
                  return (
                    <tr key={`${account.id}-${idx}`}>
                      <td className="py-3 px-4">
                        <Text as="small" color="black">
                          {account.name}
                        </Text>
                      </td>
                      <td className="py-3 px-4">
                        <Text as="small" color="ghost">
                          {formatDisplayValue(
                            account.incomeAmount ?? 0,
                            grandTotals.income,
                          )}
                        </Text>
                      </td>
                      <td className="py-3 px-4">
                        <Text as="small" color="ghost">
                          (
                          {formatDisplayValue(
                            Math.abs(account.expenseAmount ?? 0),
                            grandTotals.expense,
                          )}
                          )
                        </Text>
                      </td>
                      <td className="py-3 px-4">
                        <Text as="small" color="ghost">
                          {account.totalCount ?? 0}
                        </Text>
                      </td>
                      <td className="py-3 px-4">
                        <Text as="small" color="black" fontWeight="medium">
                          {formatDisplayValue(
                            account.net ?? 0,
                            grandTotals.net,
                          )}
                        </Text>
                      </td>
                    </tr>
                  );
                })}

                {/* Type Subtotal */}
                <tr className="border-t border-border">
                  <td className="py-3 px-4 text-sm font-semibold text-foreground">
                    {startCase(type)} Subtotal
                  </td>
                  <td className="py-3 px-4 text-sm font-semibold">
                    <Text as="small" color="black" fontWeight="medium">
                      {formatDisplayValue(
                        typeTotals.income,
                        grandTotals.income,
                      )}
                    </Text>
                  </td>
                  <td className="py-3 px-4 text-sm font-semibold">
                    <Text as="small" color="black" fontWeight="medium">
                      (
                      {formatDisplayValue(
                        typeTotals.expense,
                        grandTotals.expense,
                      )}
                      )
                    </Text>
                  </td>
                  <td className="py-3 px-4 text-sm font-semibold">
                    <Text as="small" color="ghost">
                      —
                    </Text>
                  </td>
                  <td className="py-3 px-4 text-sm font-semibold">
                    <Text as="small" color="black" fontWeight="medium">
                      {formatDisplayValue(typeTotals.net, grandTotals.net)}
                    </Text>
                  </td>
                </tr>
              </React.Fragment>
            );
          })}
        </tbody>
        <tfoot>
          <tr className="border-t-2 border-border">
            <td className="py-4 px-4 text-sm font-bold text-foreground">
              Grand Total
            </td>
            <td className="py-4 px-4 text-sm font-bold">
              <Text as="small" color="black" fontWeight="medium">
                {showPercentage
                  ? "100.0%"
                  : formatPrice(
                      grandTotals.income,
                      PriceFormat.CURRENCY_NO_DECIMALS,
                    )}
              </Text>
            </td>
            <td className="py-4 px-4 text-sm font-bold">
              <Text as="small" color="black" fontWeight="medium">
                {showPercentage ? (
                  "100.0%"
                ) : (
                  <>
                    (
                    {formatPrice(
                      grandTotals.expense,
                      PriceFormat.CURRENCY_NO_DECIMALS,
                    )}
                    )
                  </>
                )}
              </Text>
            </td>
            <td className="py-4 px-4 text-sm font-bold">
              <Text as="small" color="ghost">
                —
              </Text>
            </td>
            <td className="py-4 px-4 text-sm font-bold">
              <Text as="small" color="black" fontWeight="medium">
                {showPercentage
                  ? "100.0%"
                  : formatPrice(
                      grandTotals.net,
                      PriceFormat.CURRENCY_NO_DECIMALS,
                    )}
              </Text>
            </td>
          </tr>
        </tfoot>
      </table>
    </div>
  );
};
