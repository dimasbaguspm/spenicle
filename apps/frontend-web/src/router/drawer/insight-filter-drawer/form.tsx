import {
  FormLayout,
  SelectInput,
  SwitchInput,
  TextInput,
} from "@dimasbaguspm/versaur";
import { Controller, useForm, useWatch } from "react-hook-form";
import {
  FilterInsightDateRangePresets,
  FilterInsightFrequency,
  type FilterInsightFormSchema,
} from "./types";
import type { FC } from "react";
import { startCase } from "lodash";

interface FormProps {
  defaultValues?: Partial<FilterInsightFormSchema>;
  handleOnValidSubmit: (data: FilterInsightFormSchema) => void;
}

export const formId = "insight-filter-form";

export const Form: FC<FormProps> = ({ defaultValues, handleOnValidSubmit }) => {
  const { control, handleSubmit } = useForm<FilterInsightFormSchema>({
    defaultValues,
  });
  const watchedValues = useWatch({ control });

  return (
    <form id={formId} onSubmit={handleSubmit(handleOnValidSubmit)}>
      <FormLayout>
        <FormLayout.Column span={12}>
          <Controller
            name="dateRangePreset"
            control={control}
            render={({ field, fieldState }) => (
              <SelectInput
                {...field}
                label="Date Range"
                error={fieldState.error?.message}
                placeholder="Select date range"
              >
                {Object.entries(FilterInsightDateRangePresets).map(
                  ([key, label]) => (
                    <SelectInput.Option key={key} value={label}>
                      {startCase(label)}
                    </SelectInput.Option>
                  )
                )}
              </SelectInput>
            )}
          />
        </FormLayout.Column>
        <FormLayout.Column span={12}>
          <Controller
            control={control}
            name="useCustomDateRange"
            render={({ field }) => (
              <SwitchInput {...field} label="Custom Date Range" />
            )}
          />
        </FormLayout.Column>
        {watchedValues.useCustomDateRange && (
          <>
            <FormLayout.Column span={6}>
              <Controller
                name="customDateFrom"
                control={control}
                render={({ field, fieldState }) => (
                  <TextInput
                    {...field}
                    type="date"
                    label="From"
                    error={fieldState.error?.message}
                  />
                )}
              />
            </FormLayout.Column>
            <FormLayout.Column span={6}>
              <Controller
                name="customDateTo"
                control={control}
                render={({ field, fieldState }) => (
                  <TextInput
                    {...field}
                    type="date"
                    label="To"
                    error={fieldState.error?.message}
                  />
                )}
              />
            </FormLayout.Column>
            <FormLayout.Column span={12}>
              <Controller
                name="customFrequency"
                control={control}
                render={({ field, fieldState }) => (
                  <SelectInput
                    {...field}
                    label="Frequency"
                    error={fieldState.error?.message}
                    placeholder="Select frequency"
                  >
                    {Object.entries(FilterInsightFrequency).map(
                      ([key, label]) => (
                        <SelectInput.Option key={key} value={label}>
                          {startCase(label)}
                        </SelectInput.Option>
                      )
                    )}
                  </SelectInput>
                )}
              />
            </FormLayout.Column>
          </>
        )}
      </FormLayout>
    </form>
  );
};
