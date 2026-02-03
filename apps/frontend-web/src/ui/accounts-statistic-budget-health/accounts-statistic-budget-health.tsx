import { FC } from "react";
import { AccountStatisticBudgetHealthModel } from "@/types/schemas";
import { Text } from "@dimasbaguspm/versaur";
import { formatPrice, PriceFormat } from "@/lib/format-price";
import { formatDate, DateFormat } from "@/lib/format-date";

interface AccountsStatisticBudgetHealthProps {
  data: AccountStatisticBudgetHealthModel;
}

const getProgressColor = (status: string): string => {
  switch (status) {
    case "exceeded":
      return "bg-[var(--color-danger)]";
    case "on-track":
      return "bg-[var(--color-success)]";
    default:
      return "bg-[var(--color-warning)]";
  }
};

const getStatusText = (status: string): string => {
  return status.charAt(0).toUpperCase() + status.slice(1);
};

export const AccountsStatisticBudgetHealth: FC<
  AccountsStatisticBudgetHealthProps
> = ({ data }) => {
  const allBudgets = [
    ...(data.activeBudgets || []),
    ...(data.pastBudgets || []),
  ];
  const [primaryBudget, ...otherBudgets] = allBudgets;

  return (
    <div className="space-y-4">
      <h3 className="mb-2 text-sm font-semibold text-[var(--color-foreground-bold)]">
        Budget Health
      </h3>

      {primaryBudget ? (
        <>
          {/* Period Display */}
          <p className="text-xs text-[var(--color-foreground-light)]">
            {formatDate(primaryBudget.periodStart, DateFormat.DAY_MONTH)} -{" "}
            {formatDate(primaryBudget.periodEnd, DateFormat.DAY_MONTH_YEAR)}
          </p>

          {/* Primary Budget */}
          <div className="space-y-2">
            <div className="flex items-baseline justify-between">
              <p className="text-sm font-medium text-[var(--color-foreground-bold)]">
                {primaryBudget.budgetName}
              </p>
              <span className="text-xs font-semibold text-[var(--color-foreground-light)]">
                {Math.round(primaryBudget.percentageUsed)}%
              </span>
            </div>
            <div className="h-1.5 w-full overflow-hidden rounded-full bg-[var(--color-neutral-soft)]">
              <div
                className={`h-full transition-all ${getProgressColor(primaryBudget.status)}`}
                style={{
                  width: `${Math.min(Math.round(primaryBudget.percentageUsed), 100)}%`,
                }}
              />
            </div>
            <div className="flex items-center justify-between text-xs text-[var(--color-foreground-light)]">
              <span>
                {formatPrice(
                  primaryBudget.amountSpent,
                  PriceFormat.COMPACT_CURRENCY,
                )}{" "}
                /{" "}
                {formatPrice(
                  primaryBudget.amountLimit,
                  PriceFormat.COMPACT_CURRENCY,
                )}
              </span>
              {primaryBudget.daysRemaining > 0 && (
                <span>{primaryBudget.daysRemaining} days left</span>
              )}
            </div>
          </div>

          {/* Other Budgets List */}
          {otherBudgets.length > 0 && (
            <div className="space-y-2 border-t border-[var(--color-border)] pt-3">
              <Text
                as="p"
                transform="uppercase"
                className="text-xs text-[var(--color-foreground-light)]"
              >
                Other Budgets
              </Text>
              <div className="space-y-2">
                {otherBudgets.map((budget: any) => (
                  <div
                    key={budget.budgetId}
                    className="flex items-center justify-between"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-[var(--color-foreground-bold)]">
                        {budget.budgetName}
                      </p>
                      <p className="text-xs text-[var(--color-foreground-light)]">
                        {Math.round(budget.percentageUsed)}% •{" "}
                        {getStatusText(budget.status)}
                      </p>
                    </div>
                    <div className="ml-2 text-right">
                      <p className="text-xs font-semibold text-[var(--color-foreground-bold)]">
                        {formatPrice(
                          budget.amountSpent,
                          PriceFormat.COMPACT_CURRENCY,
                        )}
                      </p>
                      <p className="text-xs text-[var(--color-foreground-light)]">
                        of{" "}
                        {formatPrice(
                          budget.amountLimit,
                          PriceFormat.COMPACT_CURRENCY,
                        )}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      ) : (
        <p className="text-sm text-[var(--color-foreground-light)]">
          No budgets
        </p>
      )}
    </div>
  );
};
