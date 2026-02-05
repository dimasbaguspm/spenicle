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
            name="active"
            render={({ field }) => (
              <SwitchInput {...field} label="Active" />
            )}
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
