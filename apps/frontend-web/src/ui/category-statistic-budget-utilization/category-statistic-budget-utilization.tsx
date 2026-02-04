import { FC } from "react";
import { CategoryStatisticBudgetUtilizationModel } from "@/types/schemas";
import { Text } from "@dimasbaguspm/versaur";
import { formatPrice, PriceFormat } from "@/lib/format-price";

interface CategoryStatisticBudgetUtilizationProps {
  data: CategoryStatisticBudgetUtilizationModel;
}

const getProgressColor = (percentage: number): string => {
  if (percentage >= 100) {
    return "bg-[var(--color-danger)]";
  } else if (percentage >= 80) {
    return "bg-[var(--color-warning)]";
  }
  return "bg-[var(--color-primary)]";
};

export const CategoryStatisticBudgetUtilization: FC<
  CategoryStatisticBudgetUtilizationProps
> = ({ data }) => {
  const [primaryBudget, ...otherBudgets] = data.budgets || [];

  return (
    <div>
      <Text as="strong" className="mb-3 block font-semibold text-sm">
        Budget Utilization
      </Text>

      {primaryBudget ? (
        <>
          {/* Primary Budget */}
          <div className="space-y-2 mb-3">
            <div className="flex items-baseline justify-between">
              <Text as="p" className="font-medium">
                {primaryBudget.name}
              </Text>
              <Text as="strong" className="text-xs">
                {Math.round(primaryBudget.utilization)}%
              </Text>
            </div>
            <div
              className="h-1.5 w-full overflow-hidden rounded-full"
              style={{ backgroundColor: "var(--color-border)" }}
            >
              <div
                className="h-full transition-all"
                style={{
                  width: `${Math.min(Math.round(primaryBudget.utilization), 100)}%`,
                  backgroundColor: getProgressColor(primaryBudget.utilization),
                }}
              />
            </div>
            <div className="flex items-center justify-between text-xs">
              <Text as="p">
                {formatPrice(primaryBudget.spent, PriceFormat.COMPACT_CURRENCY)}{" "}
                /{" "}
                {formatPrice(primaryBudget.limit, PriceFormat.COMPACT_CURRENCY)}
              </Text>
            </div>
          </div>

          {/* Other Budgets List */}
          {otherBudgets.length > 0 && (
            <div
              className="space-y-2 border-t pt-3"
              style={{ borderColor: "var(--color-border)" }}
            >
              <Text as="p" transform="uppercase" className="text-xs">
                Other Budgets
              </Text>
              <div className="space-y-2">
                {otherBudgets.map((budget) => (
                  <div
                    key={budget.budgetId}
                    className="flex items-center justify-between"
                  >
                    <div className="min-w-0 flex-1">
                      <Text as="p" className="truncate font-medium text-sm">
                        {budget.name}
                      </Text>
                      <Text as="p" className="text-xs">
                        {Math.round(budget.utilization)}%
                      </Text>
                    </div>
                    <div className="ml-2 text-right">
                      <Text as="p" className="text-xs font-semibold">
                        {formatPrice(
                          budget.spent,
                          PriceFormat.COMPACT_CURRENCY,
                        )}
                      </Text>
                      <Text as="p" className="text-xs">
                        of{" "}
                        {formatPrice(
                          budget.limit,
                          PriceFormat.COMPACT_CURRENCY,
                        )}
                      </Text>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      ) : (
        <Text as="p" className="text-xs">
          No active budgets
        </Text>
      )}
    </div>
  );
};
