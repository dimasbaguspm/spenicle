import { SelectInput } from "@dimasbaguspm/versaur";
import { memo, type FC } from "react";
import { Controller, useFormContext } from "react-hook-form";
import type { AccountModel } from "@/types/schemas";
import type { BulkEditFormSchema } from "../types";

interface AccountSelectCellProps {
  index: number;
  accounts: AccountModel[];
}

export const EditableAccountCell: FC<AccountSelectCellProps> = memo(
  ({ index, accounts }) => {
    const { control } = useFormContext<BulkEditFormSchema>();

    return (
      <Controller
        control={control}
        name={`transactions.${index}.accountId`}
        rules={{ required: "Account is required" }}
        render={({ field, fieldState }) => (
          <SelectInput
            {...field}
            placeholder="Select account"
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
  },
);

EditableAccountCell.displayName = "EditableAccountCell";
