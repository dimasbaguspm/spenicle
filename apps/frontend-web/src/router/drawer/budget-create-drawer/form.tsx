import {
  ChipSingleInput,
  FormLayout,
  Icon,
  PriceInput,
  SwitchInput,
  TextAreaInput,
  TextInput,
} from "@dimasbaguspm/versaur";
import {
  CalendarIcon,
  CalendarDaysIcon,
  CalendarRangeIcon,
  MinusCircleIcon,
} from "lucide-react";
import { Controller, useForm } from "react-hook-form";
import type { BudgetCreateFormSchema } from "./types";

export const formId = "new-budget-form";

interface FormProps {
  defaultValues?: Partial<BudgetCreateFormSchema>;
  handleOnValidSubmit: (data: BudgetCreateFormSchema) => Promise<void>;
}

export const Form = ({ defaultValues, handleOnValidSubmit }: FormProps) => {
  const { handleSubmit, control } = useForm<BudgetCreateFormSchema>({
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
              required: "Amount limit is required",
              min: {
                value: 1,
                message: "Amount must be at least 1",
              },
            }}
            render={({ field, fieldState }) => (
              <PriceInput
                label="Amount Limit"
                {...field}
                value={field.value == null ? "" : String(field.value)}
                onChange={(val) => {
                  const cleaned = String(val).replace(/[^0-9-]+/g, "");
                  const parsed = cleaned === "" ? 0 : parseFloat(cleaned);
                  field.onChange(Number.isNaN(parsed) ? 0 : parsed);
                }}
                error={fieldState.error?.message}
              />
            )}
          />
        </FormLayout.Column>
        <FormLayout.Column span={12}>
          <Controller
            control={control}
            name="recurrence"
            rules={{ required: "Recurrence is required" }}
            render={({ field }) => (
              <ChipSingleInput {...field} label="Recurrence">
                <ChipSingleInput.Option value="none">
                  <Icon as={MinusCircleIcon} color="inherit" size="sm" />
                  One-time
                </ChipSingleInput.Option>
                <ChipSingleInput.Option value="weekly">
                  <Icon as={CalendarIcon} color="inherit" size="sm" />
                  Weekly
                </ChipSingleInput.Option>
                <ChipSingleInput.Option value="monthly">
                  <Icon as={CalendarDaysIcon} color="inherit" size="sm" />
                  Monthly
                </ChipSingleInput.Option>
                <ChipSingleInput.Option value="yearly">
                  <Icon as={CalendarRangeIcon} color="inherit" size="sm" />
                  Yearly
                </ChipSingleInput.Option>
              </ChipSingleInput>
            )}
          />
        </FormLayout.Column>
        <FormLayout.Column span={6}>
          <Controller
            control={control}
            name="startDate"
            rules={{ required: "Start date is required" }}
            render={({ field, fieldState }) => (
              <TextInput
                label="Start Date"
                type="date"
                {...field}
                error={fieldState.error?.message}
              />
            )}
          />
        </FormLayout.Column>
        <FormLayout.Column span={6}>
          <Controller
            control={control}
            name="endDate"
            render={({ field }) => (
              <TextInput label="End Date (Optional)" type="date" {...field} />
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
