import { FC } from "react";
import { CategoryStatisticAccountDistributionModel } from "@/types/schemas";
import { Text } from "@dimasbaguspm/versaur";
import { formatPrice, PriceFormat } from "@/lib/format-price";

interface CategoryStatisticAccountDistributionProps {
  data: CategoryStatisticAccountDistributionModel;
}

// Versaur design system color palette
const ACCOUNT_COLORS = [
  "#e07a5f", // primary
  "#81b29a", // secondary
  "#84a5c0", // tertiary
  "#6db285", // success
  "#e08a47", // warning
  "#e06650", // danger
];

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
        <div className="space-y-2">
          {displayAccounts.map((acc, index) => (
            <div
              key={acc.accountId}
              className="flex items-center justify-between gap-3"
            >
              {/* Account Indicator & Name */}
              <div className="flex items-center gap-2 min-w-0 flex-1">
                <div
                  className="h-2 w-2 rounded-full flex-shrink-0"
                  style={{
                    backgroundColor:
                      index < ACCOUNT_COLORS.length
                        ? ACCOUNT_COLORS[index]
                        : "#a0aec0", // neutral gray for extras
                  }}
                />
                <Text
                  as="p"
                  className="text-sm text-[var(--color-foreground-bold)] truncate"
                >
                  {acc.accountName}
                </Text>
              </div>

              {/* Percentage */}
              <Text
                as="p"
                className="font-semibold text-sm text-[var(--color-foreground-bold)] flex-shrink-0"
              >
                {acc.percentage.toFixed(0)}%
              </Text>
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
