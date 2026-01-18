import {
  ChipSingleInput,
  DateSinglePickerInput,
  FormLayout,
  Icon,
  PriceInput,
  TextAreaInput,
  TextInput,
  TextInputAsButton,
} from "@dimasbaguspm/versaur";
import {
  TrendingDownIcon,
  TrendingUpDownIcon,
  TrendingUpIcon,
} from "lucide-react";
import { Controller, useForm, useWatch } from "react-hook-form";
import type { TransactionTemplateUpdateFormSchema } from "./types";
import { When } from "@/lib/when";
import { DRAWER_ROUTES } from "@/constant/drawer-routes";
import { useDrawerProvider } from "@/providers/drawer-provider";
import type { AccountModel, CategoryModel } from "@/types/schemas";

export const formId = "update-transaction-template-form";

interface FormProps {
  defaultValues?: Partial<TransactionTemplateUpdateFormSchema>;
  handleOnValidSubmit: (
    data: TransactionTemplateUpdateFormSchema,
  ) => Promise<void>;
  accountData?: AccountModel | null;
  destinationAccountData?: AccountModel | null;
  categoryData?: CategoryModel | null;
  isInstallment: boolean;
}

export const Form = ({
  defaultValues,
  handleOnValidSubmit,
  accountData,
  destinationAccountData,
  categoryData,
  isInstallment,
}: FormProps) => {
  const { openDrawer } = useDrawerProvider();

  const { handleSubmit, control } =
    useForm<TransactionTemplateUpdateFormSchema>({
      defaultValues,
    });
  const watchedValues = useWatch({
    control,
  });

  const handleOnOpenSelectDrawer =
    (drawerId: string, fieldId: string) => () => {
      openDrawer(
        drawerId,
        {
          payloadId: fieldId,
        },
        {
          replace: true,
          state: {
            payload: watchedValues,
            returnToDrawer: isInstallment
              ? DRAWER_ROUTES.TRANSACTION_INSTALLMENT_UPDATE
              : DRAWER_ROUTES.TRANSACTION_RECURRING_UPDATE,
          },
        },
      );
    };

  return (
    <form id={formId} onSubmit={handleSubmit(handleOnValidSubmit)}>
      <FormLayout>
        <FormLayout.Column span={12}>
          <Controller
            control={control}
            name="name"
            rules={{
              required: "Name is required",
            }}
            render={({ field, fieldState }) => (
              <TextInput
                label="Name"
                helperText="Name of the transaction template"
                {...field}
                error={fieldState.error?.message}
              />
            )}
          />
        </FormLayout.Column>
        <FormLayout.Column span={isInstallment ? 6 : 12}>
          <Controller
            name="startDate"
            control={control}
            rules={{
              required: "Start Date is required",
            }}
            render={({ field, fieldState }) => (
              <DateSinglePickerInput
                label="Start Date"
                helperText="When the transaction template will start"
                {...field}
                error={fieldState.error?.message}
              />
            )}
          />
        </FormLayout.Column>
        {isInstallment && (
          <FormLayout.Column span={6}>
            <Controller
              name="endDate"
              control={control}
              rules={{
                required: "End Date is required",
              }}
              render={({ field, fieldState }) => (
                <DateSinglePickerInput
                  label="End Date"
                  helperText="When the transaction template will end"
                  {...field}
                  value={field.value || ""}
                  error={fieldState.error?.message}
                />
              )}
            />
          </FormLayout.Column>
        )}
        <FormLayout.Column span={12}>
          <Controller
            control={control}
            name="recurrence"
            rules={{
              required: "Recurrence is required",
            }}
            render={({ field }) => (
              <ChipSingleInput {...field} label="Recurrence">
                <ChipSingleInput.Option value="none">
                  None
                </ChipSingleInput.Option>
                <ChipSingleInput.Option value="weekly">
                  Weekly
                </ChipSingleInput.Option>
                <ChipSingleInput.Option value="monthly">
                  Monthly
                </ChipSingleInput.Option>
                <ChipSingleInput.Option value="yearly">
                  Yearly
                </ChipSingleInput.Option>
              </ChipSingleInput>
            )}
          />
        </FormLayout.Column>
        <FormLayout.Column span={12}>
          <Controller
            control={control}
            name="type"
            rules={{
              required: "Type is required",
            }}
            render={({ field }) => (
              <ChipSingleInput {...field} label="Type">
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
            control={control}
            name="amount"
            rules={{
              required: "Amount is required",
              min: {
                value: 1,
                message: "Amount must be at least 1",
              },
            }}
            render={({ field, fieldState }) => (
              <PriceInput
                label="Amount"
                {...field}
                value={field.value == null ? "" : String(field.value)}
                onChange={(val) => {
                  // remove any non-numeric characters (except dot and minus) then parse
                  const cleaned = String(val).replace(/[^0-9-]+/g, "");
                  const parsed = cleaned === "" ? 0 : parseFloat(cleaned);
                  field.onChange(Number.isNaN(parsed) ? 0 : parsed);
                }}
                error={fieldState.error?.message}
              />
            )}
          />
        </FormLayout.Column>

        <When condition={[watchedValues.type !== "transfer"]}>
          <FormLayout.Column span={12}>
            <Controller
              control={control}
              name="accountId"
              rules={{
                validate: (value) => {
                  if (!value) {
                    return "Source account is required";
                  }
                  return true;
                },
              }}
              render={({ field, fieldState }) => (
                <TextInputAsButton
                  onClick={handleOnOpenSelectDrawer(
                    DRAWER_ROUTES.SELECT_SINGLE_ACCOUNT,
                    "accountId",
                  )}
                  label="Source"
                  placeholder="Select account"
                  displayValue={accountData?.name ?? ""}
                  error={fieldState.error?.message}
                  {...field}
                />
              )}
            />
          </FormLayout.Column>
        </When>

        <When condition={[watchedValues.type === "transfer"]}>
          <FormLayout.Column span={12}>
            <Controller
              control={control}
              name="accountId"
              rules={{
                deps: ["destinationAccountId"],
                validate: (value, formValues) => {
                  if (!value) {
                    return "Source account is required";
                  }

                  if (value === formValues.destinationAccountId) {
                    return "Source and Destination accounts must be different";
                  }

                  return true;
                },
              }}
              render={({ field, fieldState }) => (
                <TextInputAsButton
                  onClick={handleOnOpenSelectDrawer(
                    DRAWER_ROUTES.SELECT_SINGLE_ACCOUNT,
                    "accountId",
                  )}
                  label="Source"
                  placeholder="Select account"
                  displayValue={accountData?.name ?? ""}
                  error={fieldState.error?.message}
                  {...field}
                />
              )}
            />
          </FormLayout.Column>
          <FormLayout.Column span={12}>
            <Controller
              control={control}
              name="destinationAccountId"
              rules={{
                deps: ["accountId"],
                validate: (value, formValues) => {
                  if (!value) {
                    return "Destination account is required";
                  }

                  if (value === formValues.accountId) {
                    return "Source and Destination accounts must be different";
                  }
                  return true;
                },
              }}
              render={({ field, fieldState }) => (
                <TextInputAsButton
                  onClick={handleOnOpenSelectDrawer(
                    DRAWER_ROUTES.SELECT_SINGLE_ACCOUNT,
                    "destinationAccountId",
                  )}
                  label="Destination"
                  placeholder="Select account"
                  displayValue={destinationAccountData?.name ?? ""}
                  error={fieldState.error?.message}
                  {...field}
                />
              )}
            />
          </FormLayout.Column>
        </When>

        <FormLayout.Column span={12}>
          <Controller
            control={control}
            name="categoryId"
            rules={{
              validate: (value) => {
                if (!value) {
                  return "Category is required";
                }
                return true;
              },
            }}
            render={({ field, fieldState }) => (
              <TextInputAsButton
                label="Category"
                onClick={handleOnOpenSelectDrawer(
                  DRAWER_ROUTES.SELECT_SINGLE_CATEGORY,
                  "categoryId",
                )}
                placeholder="Select category"
                displayValue={categoryData?.name ?? ""}
                error={fieldState.error?.message}
                {...field}
              />
            )}
          />
        </FormLayout.Column>

        <FormLayout.Column span={12}>
          <Controller
            name="notes"
            control={control}
            render={({ field, fieldState }) => (
              <TextAreaInput
                label="Notes"
                row={4}
                error={fieldState.error?.message}
                {...field}
              />
            )}
          />
        </FormLayout.Column>
      </FormLayout>
    </form>
  );
};
