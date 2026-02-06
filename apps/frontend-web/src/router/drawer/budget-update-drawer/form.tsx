import {
  FormLayout,
  SwitchInput,
  TextAreaInput,
  TextInput,
} from "@dimasbaguspm/versaur";
import { Controller, useForm } from "react-hook-form";
import type { BudgetUpdateFormSchema } from "./types";

export const formId = "update-budget-form";

interface FormProps {
  defaultValues?: Partial<BudgetUpdateFormSchema>;
  handleOnValidSubmit: (data: BudgetUpdateFormSchema) => Promise<void>;
}

export const Form = ({ defaultValues, handleOnValidSubmit }: FormProps) => {
  const { handleSubmit, control } = useForm<BudgetUpdateFormSchema>({
    defaultValues,
  });

  return (
    <form id={formId} onSubmit={handleSubmit(handleOnValidSubmit)}>
      <FormLayout>
        <FormLayout.Column span={12}>
          <Controller
            control={control}
            name="name"
            rules={{ required: "Name is required" }}
            render={({ field, fieldState }) => (
              <TextInput
                label="Name"
                placeholder="Enter budget name"
                {...field}
                error={fieldState.error?.message}
              />
            )}
          />
        </FormLayout.Column>
        <FormLayout.Column span={12}>
          <Controller
            control={control}
            name="amountLimit"
            rules={{
              required: "Amount Limit is required",
              min: { value: 0.01, message: "Amount must be at least 0.01" },
            }}
            render={({ field, fieldState }) => (
              <TextInput
                label="Amount Limit"
                placeholder="Enter amount limit"
                type="number"
                step="0.01"
                {...field}
                value={field.value ?? ""}
                onChange={(e) =>
                  field.onChange(
                    e.target.value ? parseFloat(e.target.value) : "",
                  )
                }
                error={fieldState.error?.message}
              />
            )}
          />
        </FormLayout.Column>
        <FormLayout.Column span={12}>
          <Controller
            control={control}
            name="active"
            render={({ field }) => <SwitchInput {...field} label="Active" />}
          />
        </FormLayout.Column>
        <FormLayout.Column span={12}>
          <Controller
            name="note"
            control={control}
            render={({ field }) => (
              <TextAreaInput label="Note" row={4} {...field} />
            )}
          />
        </FormLayout.Column>
      </FormLayout>
    </form>
  );
};
