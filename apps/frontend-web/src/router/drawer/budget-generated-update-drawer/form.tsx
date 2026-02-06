import { Controller, useForm } from "react-hook-form";
import { FormLayout, TextInput } from "@dimasbaguspm/versaur";
import type { BudgetGeneratedUpdateFormSchema } from "./types";

export const formId = "update-generated-budget-form";

interface FormProps {
  defaultValues?: Partial<BudgetGeneratedUpdateFormSchema>;
  handleOnValidSubmit: (data: BudgetGeneratedUpdateFormSchema) => Promise<void>;
}

export const Form = ({ defaultValues, handleOnValidSubmit }: FormProps) => {
  const { control, handleSubmit } = useForm<BudgetGeneratedUpdateFormSchema>({
    defaultValues,
  });

  return (
    <form id={formId} onSubmit={handleSubmit(handleOnValidSubmit)}>
      <FormLayout>
        <FormLayout.Column span={12}>
          <Controller
            control={control}
            name="amountLimit"
            rules={{
              required: "Amount limit is required",
              min: { value: 0.01, message: "Amount must be positive" },
            }}
            render={({ field, fieldState }) => (
              <TextInput
                label="Amount Limit"
                type="number"
                step="0.01"
                min="0.01"
                placeholder="Enter amount"
                {...field}
                error={fieldState.error?.message}
              />
            )}
          />
        </FormLayout.Column>
      </FormLayout>
    </form>
  );
};
