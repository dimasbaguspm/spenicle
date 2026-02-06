import { Controller, useForm } from "react-hook-form";
import {
  Drawer,
  Button,
  ButtonGroup,
  TextInput,
  PageLoader,
  useDesktopBreakpoint,
} from "@dimasbaguspm/versaur";
import { useDrawerProvider } from "@/providers/drawer-provider";
import {
  useApiRelatedBudgetsInfiniteQuery,
  useApiUpdateGeneratedBudget,
} from "@/hooks/use-api";
import { formatPrice, PriceFormat } from "@/lib/format-price";
import { When } from "@/lib/when";
import type { FC } from "react";

interface BudgetGeneratedUpdateDrawerProps {
  templateId: number;
  budgetId: number;
}

interface FormSchema {
  amountLimit: number;
}

export const BudgetGeneratedUpdateDrawer: FC<
  BudgetGeneratedUpdateDrawerProps
> = ({ templateId, budgetId }) => {
  const { closeDrawer } = useDrawerProvider();
  const isDesktop = useDesktopBreakpoint();

  const [relatedBudgets, , { isPending }] = useApiRelatedBudgetsInfiniteQuery(
    templateId,
    {},
    { enabled: !!templateId }
  );

  const budget = relatedBudgets.find((b) => b.id === budgetId);

  const [updateGeneratedBudget, , { isPending: isUpdating }] =
    useApiUpdateGeneratedBudget();

  const { control, handleSubmit } = useForm<FormSchema>({
    defaultValues: {
      amountLimit: budget?.amountLimit ? budget.amountLimit / 100 : 0,
    },
  });

  const onSubmit = async (data: FormSchema) => {
    try {
      await updateGeneratedBudget({
        templateId,
        budgetId,
        amountLimit: Math.round(data.amountLimit * 100),
      });
      closeDrawer();
    } catch (error) {
      console.error("Failed to update budget:", error);
    }
  };

  return (
    <>
      <Drawer.Header>
        <Drawer.Title>Update Budget Limit</Drawer.Title>
        <Drawer.CloseButton />
      </Drawer.Header>

      <When condition={isPending}>
        <PageLoader />
      </When>

      <When condition={!isPending && !!budget}>
        <Drawer.Body>
          <div className="mb-4">
            <p className="text-sm text-muted-foreground mb-2">
              Budget Period: {budget?.periodStart} - {budget?.periodEnd}
            </p>
            <p className="text-sm text-muted-foreground mb-4">
              Current Limit:{" "}
              {formatPrice(budget?.amountLimit ?? 0, PriceFormat.CURRENCY)}
            </p>
          </div>

          <form id="update-generated-budget-form" onSubmit={handleSubmit(onSubmit)}>
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
          </form>
        </Drawer.Body>

        <Drawer.Footer>
          <ButtonGroup alignment="end" fluid={!isDesktop}>
            <Button variant="ghost" onClick={closeDrawer}>
              Cancel
            </Button>
            <Button
              type="submit"
              form="update-generated-budget-form"
              disabled={isUpdating}
            >
              {isUpdating ? "Updating..." : "Update Limit"}
            </Button>
          </ButtonGroup>
        </Drawer.Footer>
      </When>
    </>
  );
};
