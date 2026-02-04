import { FC } from "react";
import { CategoryStatisticAccountDistributionModel } from "@/types/schemas";
import { Text } from "@dimasbaguspm/versaur";
import { formatPrice, PriceFormat } from "@/lib/format-price";

interface CategoryStatisticAccountDistributionProps {
  data: CategoryStatisticAccountDistributionModel;
}

export const CategoryStatisticAccountDistribution: FC<
  CategoryStatisticAccountDistributionProps
> = ({ data }) => {
  const sorted = [...(data.accounts || [])].sort(
    (a, b) => b.percentage - a.percentage,
  );

  // Combine 6th account onwards into "Others"
  const topAccounts = sorted.slice(0, 5);
  const othersPercentage = sorted
    .slice(5)
    .reduce((sum, acc) => sum + acc.percentage, 0);
  const displayAccounts =
    othersPercentage > 0
      ? [
          ...topAccounts,
          {
            accountId: "others",
            accountName: "Others",
            percentage: othersPercentage,
          },
        ]
      : topAccounts;

  return (
    <div>
      <div className="mb-3 flex justify-between items-baseline">
        <Text as="strong" className="font-semibold text-sm">
          Top Accounts
        </Text>
        <Text as="p" className="text-xs">
          Total:{" "}
          {formatPrice(data.totalSpending, PriceFormat.CURRENCY_NO_DECIMALS)}
        </Text>
      </div>

      {displayAccounts.length > 0 ? (
        <div className="space-y-3">
          {displayAccounts.map((acc) => (
            <div key={acc.accountId}>
              <div className="flex justify-between mb-1">
                <Text as="p" className="text-xs truncate">
                  {acc.accountName}
                </Text>
                <Text as="strong" className="text-xs">
                  {acc.percentage.toFixed(0)}%
                </Text>
              </div>
              <div
                className="h-1.5 w-full rounded-full"
                style={{ backgroundColor: "var(--color-border)" }}
              >
                <div
                  className="h-full rounded-full transition-all"
                  style={{
                    width: `${acc.percentage}%`,
                    backgroundColor: "var(--color-primary)",
                  }}
                />
              </div>
            </div>
          ))}
        </div>
      ) : (
        <Text as="p" className="text-xs">
          No account data available
        </Text>
      )}
    </div>
  );
};
