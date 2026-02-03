import { FC } from "react";
import { AccountStatisticCategoryHeatmapModel } from "@/types/schemas";
import { Text } from "@dimasbaguspm/versaur";

interface AccountsStatisticCategoryHeatmapProps {
  data: AccountStatisticCategoryHeatmapModel;
}

// Versaur design system color palette
const CATEGORY_COLORS = [
  "#e07a5f", // primary
  "#81b29a", // secondary
  "#84a5c0", // tertiary
  "#6db285", // success
  "#e08a47", // warning
  "#e06650", // danger
];

export const AccountsStatisticCategoryHeatmap: FC<
  AccountsStatisticCategoryHeatmapProps
> = ({ data }) => {
  // Sort categories by percentage (descending)
  const sortedCategories = [...(data.data || [])].sort(
    (a, b) => b.percentageOfTotal - a.percentageOfTotal,
  );

  // Limit to top 5 colors, combine rest as "Others"
  const MAX_CATEGORIES = 5;
  let displayCategories: Array<any> = sortedCategories.slice(0, MAX_CATEGORIES);

  if (sortedCategories.length > MAX_CATEGORIES) {
    const otherCategories = sortedCategories.slice(MAX_CATEGORIES);
    const othersPercentage = otherCategories.reduce(
      (sum, cat) => sum + cat.percentageOfTotal,
      0,
    );

    displayCategories = [
      ...displayCategories,
      {
        categoryId: 0,
        categoryName: "Others",
        percentageOfTotal: parseFloat(othersPercentage.toFixed(1)),
        totalAmount: 0,
        totalCount: 0,
        isOthers: true,
      },
    ];
  }

  const hasData = displayCategories.length > 0;

  return (
    <div>
      <Text as="strong" className="mb-2 block font-semibold text-sm">
        Category Breakdown
      </Text>

      {hasData ? (
        <div className="space-y-2">
          {displayCategories.map((category: any, index: number) => (
            <div
              key={category.categoryId + (category.isOthers ? "-others" : "")}
              className="flex items-center justify-between gap-3"
            >
              {/* Category Indicator & Name */}
              <div className="flex items-center gap-2 min-w-0 flex-1">
                <div
                  className="h-2 w-2 rounded-full flex-shrink-0"
                  style={{
                    backgroundColor:
                      index < CATEGORY_COLORS.length
                        ? CATEGORY_COLORS[index]
                        : "#a0aec0", // neutral gray for "Others"
                  }}
                />
                <Text
                  as="p"
                  className="text-sm text-[var(--color-foreground-bold)] truncate"
                >
                  {category.categoryName}
                </Text>
              </div>

              {/* Percentage */}
              <Text
                as="p"
                className="font-semibold text-sm text-[var(--color-foreground-bold)] flex-shrink-0"
              >
                {category.percentageOfTotal}%
              </Text>
            </div>
          ))}
        </div>
      ) : (
        <Text as="p" className="text-sm text-[var(--color-foreground-light)]">
          No data available
        </Text>
      )}
    </div>
  );
};
