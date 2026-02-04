import { FC } from "react";
import { CategoryStatisticAverageTransactionSizeModel } from "@/types/schemas";
import { Text } from "@dimasbaguspm/versaur";
import { formatPrice, PriceFormat } from "@/lib/format-price";

interface CategoryStatisticAverageTransactionSizeProps {
  data: CategoryStatisticAverageTransactionSizeModel;
}

export const CategoryStatisticAverageTransactionSize: FC<
  CategoryStatisticAverageTransactionSizeProps
> = ({ data }) => {
  return (
    <div>
      <Text as="strong" className="mb-2 block font-semibold text-sm">
        Transaction Size
      </Text>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <Text as="p" transform="uppercase" className="text-xs">
            Min
          </Text>
          <Text as="p" className="mt-1 font-semibold">
            {formatPrice(data.minAmount, PriceFormat.CURRENCY_NO_DECIMALS)}
          </Text>
        </div>

        <div>
          <Text as="p" transform="uppercase" className="text-xs">
            Max
          </Text>
          <Text as="p" className="mt-1 font-semibold">
            {formatPrice(data.maxAmount, PriceFormat.CURRENCY_NO_DECIMALS)}
          </Text>
        </div>

        <div>
          <Text as="p" transform="uppercase" className="text-xs">
            Avg
          </Text>
          <Text as="p" className="mt-1 font-semibold">
            {formatPrice(data.averageAmount, PriceFormat.CURRENCY_NO_DECIMALS)}
          </Text>
        </div>

        <div>
          <Text as="p" transform="uppercase" className="text-xs">
            Median
          </Text>
          <Text as="p" className="mt-1 font-semibold">
            {formatPrice(data.medianAmount, PriceFormat.CURRENCY_NO_DECIMALS)}
          </Text>
        </div>
      </div>
    </div>
  );
};
