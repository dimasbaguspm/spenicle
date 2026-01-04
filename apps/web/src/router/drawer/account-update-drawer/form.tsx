import {
  ChipSingleInput,
  FormLayout,
  Icon,
  TextAreaInput,
  TextInput,
} from "@dimasbaguspm/versaur";
import { TrendingDownIcon, TrendingUpIcon } from "lucide-react";
import { Controller, useForm } from "react-hook-form";
import type { AccountUpdateFormSchema } from "./types";

export const formId = "update-account-form";

interface FormProps {
  defaultValues?: Partial<AccountUpdateFormSchema>;
  handleOnValidSubmit: (data: AccountUpdateFormSchema) => Promise<void>;
}

export const Form = ({ defaultValues, handleOnValidSubmit }: FormProps) => {
  const { handleSubmit, control } = useForm<AccountUpdateFormSchema>({
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
                placeholder="Enter account name"
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
