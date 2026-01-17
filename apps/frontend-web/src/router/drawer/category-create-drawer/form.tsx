import {
  ChipSingleInput,
  FormLayout,
  Icon,
  TextAreaInput,
  TextInput,
} from "@dimasbaguspm/versaur";
import {
  TrendingDownIcon,
  TrendingUpDownIcon,
  TrendingUpIcon,
} from "lucide-react";
import { Controller, useForm } from "react-hook-form";
import type { CategoryCreateFormSchema } from "./types";

export const formId = "new-account-form";

interface FormProps {
  defaultValues?: Partial<CategoryCreateFormSchema>;
  handleOnValidSubmit: (data: CategoryCreateFormSchema) => Promise<void>;
}

export const Form = ({ defaultValues, handleOnValidSubmit }: FormProps) => {
  const { handleSubmit, control } = useForm<CategoryCreateFormSchema>({
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
                placeholder="Enter category name"
                {...field}
                error={fieldState.error?.message}
              />
            )}
          />
        </FormLayout.Column>
        <FormLayout.Column span={12}>
          <Controller
            name="type"
            control={control}
            rules={{ required: "Type is required" }}
            render={({ field, fieldState }) => (
              <ChipSingleInput
                {...field}
                label="Type"
                error={fieldState.error?.message}
              >
                <ChipSingleInput.Option value="expense">
                  <Icon as={TrendingDownIcon} color="inherit" size="sm" />
                  Expense
                </ChipSingleInput.Option>
                <ChipSingleInput.Option value="income">
                  <Icon as={TrendingUpIcon} color="inherit" size="sm" />
                  Income
                </ChipSingleInput.Option>
                <ChipSingleInput.Option value="transfer">
                  <Icon as={TrendingUpDownIcon} color="inherit" size="sm" />
                  Transfer
                </ChipSingleInput.Option>
              </ChipSingleInput>
            )}
          />
        </FormLayout.Column>
        <FormLayout.Column span={12}>
          <Controller
            name="notes"
            control={control}
            render={({ field }) => (
              <TextAreaInput label="Notes" row={6} {...field} />
            )}
          />
        </FormLayout.Column>
      </FormLayout>
    </form>
  );
};
