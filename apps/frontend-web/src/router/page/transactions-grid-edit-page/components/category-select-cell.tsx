import { SelectInput } from "@dimasbaguspm/versaur";
import { memo, type FC } from "react";
import { Controller, useFormContext } from "react-hook-form";
import type { CategoryModel } from "@/types/schemas";
import type { BulkEditFormSchema } from "../types";

interface CategorySelectCellProps {
  index: number;
  categories: CategoryModel[];
}

export const EditableCategoryCell: FC<CategorySelectCellProps> = memo(
  ({ index, categories }) => {
    const { control } = useFormContext<BulkEditFormSchema>();

    return (
      <Controller
        control={control}
        name={`transactions.${index}.categoryId`}
        rules={{ required: "Category is required" }}
        render={({ field, fieldState }) => (
          <SelectInput
            {...field}
            placeholder="Select category"
            error={fieldState.error?.message}
            onChange={(value) => {
              // SelectInput returns string, convert to number
              const numValue =
                typeof value === "string" ? parseInt(value, 10) : value;
              field.onChange(numValue);
            }}
          >
            {categories.map((cat) => (
              <SelectInput.Option key={cat.id} value={cat.id.toString()}>
                {cat.name}
              </SelectInput.Option>
            ))}
          </SelectInput>
        )}
      />
    );
  },
);

EditableCategoryCell.displayName = "EditableCategoryCell";
