import {
  DateSinglePickerInput,
  PriceInput,
  TextInput,
  TimePickerInput,
  SelectInput,
} from "@dimasbaguspm/versaur";
import { Controller, useFormContext } from "react-hook-form";
import { memo, type FC } from "react";
import type { BulkEditFormSchema } from "../types";

interface CellProps {
  index: number;
}

// Date cell
export const EditableDateCell: FC<CellProps> = memo(({ index }) => {
  const { control } = useFormContext<BulkEditFormSchema>();
  return (
    <Controller
      control={control}
      name={`transactions.${index}.date`}
      rules={{ required: "Date is required" }}
      render={({ field, fieldState }) => (
        <div className="min-h-[48px] flex items-center">
          <DateSinglePickerInput
            {...field}
            value={field.value || ""}
            error={fieldState.error?.message}
            className="w-full"
          />
        </div>
      )}
    />
  );
});

EditableDateCell.displayName = "EditableDateCell";

// Time cell
export const EditableTimeCell: FC<CellProps> = memo(({ index }) => {
  const { control } = useFormContext<BulkEditFormSchema>();
  return (
    <Controller
      control={control}
      name={`transactions.${index}.time`}
      rules={{ required: "Time is required" }}
      render={({ field, fieldState }) => (
        <div className="min-h-[48px] flex items-center">
          <TimePickerInput
            {...field}
            value={field.value || ""}
            error={fieldState.error?.message}
            className="w-full"
          />
        </div>
      )}
    />
  );
});

EditableTimeCell.displayName = "EditableTimeCell";

// Type cell
export const EditableTypeCell: FC<CellProps> = memo(({ index }) => {
  const { control } = useFormContext<BulkEditFormSchema>();
  return (
    <Controller
      control={control}
      name={`transactions.${index}.type`}
      rules={{ required: "Type is required" }}
      render={({ field, fieldState }) => (
        <SelectInput
          {...field}
          placeholder="Select type"
          error={fieldState.error?.message}
        >
          <SelectInput.Option value="expense">Expense</SelectInput.Option>
          <SelectInput.Option value="income">Income</SelectInput.Option>
          <SelectInput.Option value="transfer">Transfer</SelectInput.Option>
        </SelectInput>
      )}
    />
  );
});

EditableTypeCell.displayName = "EditableTypeCell";

// Amount cell
export const EditableAmountCell: FC<CellProps> = memo(({ index }) => {
  const { control } = useFormContext<BulkEditFormSchema>();
  return (
    <Controller
      control={control}
      name={`transactions.${index}.amount`}
      rules={{
        required: "Amount is required",
        min: { value: 1, message: "Amount must be at least 1" },
      }}
      render={({ field, fieldState }) => (
        <div className="min-h-[48px] flex items-center">
          <PriceInput
            value={field.value == null ? "" : String(field.value)}
            onChange={(val) => {
              // PriceInput accepts string input, parse to number for storage
              const cleaned = String(val).replace(/[^0-9.]+/g, "");
              const parsed = cleaned === "" ? 0 : parseFloat(cleaned);
              field.onChange(Number.isNaN(parsed) ? 0 : parsed);
            }}
            error={fieldState.error?.message}
            className="w-full"
          />
        </div>
      )}
    />
  );
});

EditableAmountCell.displayName = "EditableAmountCell";

// Notes cell - allows editing of transaction notes
export const EditableNotesCell: FC<CellProps> = memo(({ index }) => {
  const { control } = useFormContext<BulkEditFormSchema>();
  return (
    <Controller
      control={control}
      name={`transactions.${index}.note`}
      render={({ field }) => (
        <div className="min-h-[48px] flex items-center">
          <TextInput {...field} placeholder="Add note..." className="w-full" />
        </div>
      )}
    />
  );
});

EditableNotesCell.displayName = "EditableNotesCell";
