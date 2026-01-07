import { formatPrice, PriceFormat } from "@/lib/format-price";
import type {
  InsightsAccountsModel,
  InsightsCategoryModel,
} from "@/types/schemas";
import { useMemo } from "react";
import { ResponsiveContainer, Treemap, Tooltip } from "recharts";

interface FundingSourceTreemapProps {
  accountData: InsightsAccountsModel["data"];
  categoryData: InsightsCategoryModel["data"];
  mode: "sources" | "expenses";
}

const COLORS = [
  "#3b82f6",
  "#10b981",
  "#f59e0b",
  "#ef4444",
  "#8b5cf6",
  "#ec4899",
  "#06b6d4",
  "#84cc16",
  "#f97316",
  "#6366f1",
];

export const FundingSourceTreemap = ({
  accountData,
  categoryData,
  mode,
}: FundingSourceTreemapProps) => {
  const treemapData = useMemo(() => {
    if (mode === "sources") {
      // Show income by account
      const sourceData = (accountData ?? [])
        .filter((account) => (account.incomeAmount ?? 0) > 0)
        .map((account, idx) => ({
          name: account.accountName,
          size: account.incomeAmount ?? 0,
          color: COLORS[idx % COLORS.length],
        }))
        .sort((a, b) => b.size - a.size);

      return sourceData.length > 0
        ? sourceData
        : [{ name: "No Data", size: 1, color: "#e5e7eb" }];
    } else {
      // Show expenses by category
      const expenseData = (categoryData ?? [])
        .filter((category) => Math.abs(category.expenseAmount ?? 0) > 0)
        .map((category, idx) => ({
          name: category.categoryName,
          size: Math.abs(category.expenseAmount ?? 0),
          color: COLORS[idx % COLORS.length],
        }))
        .sort((a, b) => b.size - a.size);

      return expenseData.length > 0
        ? expenseData
        : [{ name: "No Data", size: 1, color: "#e5e7eb" }];
    }
  }, [accountData, categoryData, mode]);

  const totalValue = useMemo(() => {
    return treemapData.reduce((sum, item) => sum + item.size, 0);
  }, [treemapData]);

  const CustomizedContent = (props: any) => {
    const { x, y, width, height, name, size, color } = props;

    // Don't render if too small or invalid data
    if (width < 50 || height < 50 || !size || isNaN(size)) return null;

    const percentage = totalValue > 0 ? (size / totalValue) * 100 : 0;

    return (
      <g>
        <rect
          x={x}
          y={y}
          width={width}
          height={height}
          style={{
            fill: color,
            stroke: "#fff",
            strokeWidth: 2,
            strokeOpacity: 1,
          }}
        />
        <text
          x={x + width / 2}
          y={y + height / 2 - 10}
          textAnchor="middle"
          fill="#fff"
          fontSize={14}
          fontWeight="600"
        >
          {name}
        </text>
        <text
          x={x + width / 2}
          y={y + height / 2 + 10}
          textAnchor="middle"
          fill="#fff"
          fontSize={12}
        >
          {formatPrice(size, PriceFormat.COMPACT)}
        </text>
        <text
          x={x + width / 2}
          y={y + height / 2 + 28}
          textAnchor="middle"
          fill="#fff"
          fontSize={11}
          opacity={0.9}
        >
          ({percentage.toFixed(1)}%)
        </text>
      </g>
    );
  };

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;

      // Safety check for valid data
      if (!data || !data.size || isNaN(data.size)) return null;

      const percentage = totalValue > 0 ? (data.size / totalValue) * 100 : 0;

      return (
        <div className="bg-white p-4 rounded-lg shadow-lg border border-gray-200">
          <div className="flex items-center space-x-2 mb-2">
            <div
              className="w-4 h-4 rounded"
              style={{ backgroundColor: data.color }}
            />
            <p className="font-semibold text-gray-900">{data.name}</p>
          </div>
          <div className="space-y-1 text-sm">
            <div className="flex justify-between space-x-4">
              <span className="text-gray-600">Amount:</span>
              <span className="font-medium text-gray-900">
                {formatPrice(data.size, PriceFormat.CURRENCY)}
              </span>
            </div>
            <div className="flex justify-between space-x-4">
              <span className="text-gray-600">Percentage:</span>
              <span className="font-medium text-gray-900">
                {percentage.toFixed(2)}%
              </span>
            </div>
          </div>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="bg-white rounded-lg p-6 shadow-sm border border-gray-200">
      <div className="mb-4">
        <h3 className="text-lg font-semibold text-gray-900">
          {mode === "sources" ? "Funding Sources" : "Expense Groups"}
        </h3>
        <p className="text-sm text-gray-500 mt-1">
          {mode === "sources"
            ? "Income distribution by account"
            : "Expense distribution by category"}
        </p>
      </div>

      <div className="mb-4">
        <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
          <span className="text-sm font-medium text-gray-700">Total:</span>
          <span className="text-lg font-bold text-gray-900">
            {formatPrice(totalValue, PriceFormat.CURRENCY)}
          </span>
        </div>
      </div>

      <ResponsiveContainer width="100%" height={400}>
        <Treemap
          data={treemapData}
          dataKey="size"
          stroke="#fff"
          fill="#8884d8"
          content={<CustomizedContent />}
        >
          <Tooltip content={<CustomTooltip />} />
        </Treemap>
      </ResponsiveContainer>

      {/* Legend */}
      <div className="mt-6 grid grid-cols-2 md:grid-cols-3 gap-3">
        {treemapData.slice(0, 6).map((item, idx) => {
          const percentage =
            totalValue > 0 ? (item.size / totalValue) * 100 : 0;
          return (
            <div
              key={`${item.name}-${idx}`}
              className="flex items-center space-x-2 text-sm"
            >
              <div
                className="w-3 h-3 rounded flex-shrink-0"
                style={{ backgroundColor: item.color }}
              />
              <span className="text-gray-700 truncate flex-1">{item.name}</span>
              <span className="text-gray-500 text-xs">
                {percentage.toFixed(0)}%
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
};
