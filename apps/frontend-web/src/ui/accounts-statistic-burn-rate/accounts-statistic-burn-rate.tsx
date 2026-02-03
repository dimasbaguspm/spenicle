import { FC } from "react";
import { AccountStatisticBurnRateModel } from "@/types/schemas";
import { formatPrice, PriceFormat } from "@/lib/format-price";
import { Text } from "@dimasbaguspm/versaur";

interface AccountsStatisticBurnRateProps {
  data: AccountStatisticBurnRateModel;
}

export const AccountsStatisticBurnRate: FC<AccountsStatisticBurnRateProps> = ({
  data,
}) => {
  const hasData =
    data &&
    (data.dailyAverageSpend ||
      data.weeklyAverageSpend ||
      data.monthlyAverageSpend);

  return (
    <div>
      <Text as="strong" className="mb-2 block font-semibold text-sm">
        Burn Rate Averages
      </Text>

      {hasData ? (
        <div className="grid grid-cols-3 gap-4">
          <div>
            <Text as="p" transform="uppercase" className="text-xs">
              Daily
            </Text>
            <Text as="p" className="font-semibold">
              {formatPrice(
                data.dailyAverageSpend,
                PriceFormat.COMPACT_CURRENCY,
              )}
            </Text>
          </div>

          <div>
            <Text as="p" transform="uppercase" className="text-xs">
              Weekly
            </Text>
            <Text as="p" className="font-semibold">
              {formatPrice(
                data.weeklyAverageSpend,
                PriceFormat.COMPACT_CURRENCY,
              )}
            </Text>
          </div>

          <div>
            <Text as="p" transform="uppercase" className="text-xs">
              Monthly
            </Text>
            <Text as="p" className="font-semibold">
              {formatPrice(
                data.monthlyAverageSpend,
                PriceFormat.COMPACT_CURRENCY,
              )}
            </Text>
          </div>
        </div>
      ) : (
        <Text as="p" className="text-sm text-[var(--color-foreground-light)]">
          No data available
        </Text>
      )}
    </div>
  );
};
