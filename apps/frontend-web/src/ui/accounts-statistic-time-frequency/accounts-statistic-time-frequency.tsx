import { FC } from "react";
import { AccountStatisticTimeFrequencyModel } from "@/types/schemas";
import { Text } from "@dimasbaguspm/versaur";
import { startCase } from "lodash";

interface AccountsStatisticTimeFrequencyProps {
  data: AccountStatisticTimeFrequencyModel;
}

export const AccountsStatisticTimeFrequency: FC<
  AccountsStatisticTimeFrequencyProps
> = ({ data }) => {
  const hasData = data && data.totalTransactions > 0;

  return (
    <div>
      <Text as="strong" className="mb-2 block font-semibold text-sm">
        Transaction Habit
      </Text>

      {hasData ? (
        <div className="grid grid-cols-2 gap-4">
          <div>
            <Text as="p" transform="uppercase" className="text-xs">
              Most Common Pattern
            </Text>
            <Text as="p" className="mt-1 font-semibold">
              {startCase(data.mostCommonPattern)}
            </Text>
          </div>

          <div>
            <Text as="p" transform="uppercase" className="text-xs">
              Total Transactions
            </Text>
            <Text as="p" className="mt-1 font-semibold">
              {data.totalTransactions}
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
