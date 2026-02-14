import { SelectInput } from "@dimasbaguspm/versaur";
import { memo, type FC } from "react";
import { Controller, useWatch, useFormContext } from "react-hook-form";
import type { AccountModel } from "@/types/schemas";
import type { BulkEditFormSchema } from "../types";

interface DestinationAccountSelectCellProps {
  index: number;
  accounts: AccountModel[];
}

export const EditableDestinationAccountCell: FC<DestinationAccountSelectCellProps> =
  memo(({ index, accounts }) => {
    const { control } = useFormContext<BulkEditFormSchema>();

    const transactionType = useWatch({
      control,
      name: `transactions.${index}.type`,
    });

    // Only show for transfer transactions
    if (transactionType !== "transfer") {
      return null;
    }

    return (
      <Controller
        control={control}
        name={`transactions.${index}.destinationAccountId`}
        rules={{
          required: "Destination account is required for transfers",
        }}
        render={({ field, fieldState }) => (
          <SelectInput
            {...field}
            placeholder="Select destination"
            error={fieldState.error?.message}
            onChange={(value) => {
              // SelectInput returns string, convert to number
              const numValue =
                typeof value === "string" ? parseInt(value, 10) : value;
              field.onChange(numValue);
            }}
          >
            {accounts.map((acc) => (
              <SelectInput.Option key={acc.id} value={acc.id.toString()}>
                {acc.name}
              </SelectInput.Option>
            ))}
          </SelectInput>
        )}
      />
    );
  });

EditableDestinationAccountCell.displayName = "EditableDestinationAccountCell";
