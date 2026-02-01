import type { CategoryModel } from "@/types/schemas";
import { capitalize } from "lodash";
import { nameToInitials } from "../name-to-initial";
import { DateFormat, formatDate } from "../format-date";
import { formatPrice, PriceFormat } from "../format-price";
import { BadgeProps } from "@dimasbaguspm/versaur";

export const formatCategoryData = (category: CategoryModel | null) => {
  const isIncome = category?.type === "income";
  const isExpense = category?.type === "expense";
  const isTransfer = category?.type === "transfer";

  const variant = isExpense ? "primary" : isIncome ? "secondary" : "tertiary";

  const trimmedNotes = category?.note
    ? `${category.note.slice(0, 25) + (category.note.length > 25 ? "..." : "")}`
    : "";
  const note = category?.note;

  const hasBudget = !!category?.budget;
  const amountLimit = category?.budget?.amountLimit || 0;
  const actualAmount = category?.budget?.actualAmount || 0;
  const remainingBudget = amountLimit - actualAmount;

  const formattedRemainingAmount = formatPrice(
    Math.abs(remainingBudget),
    PriceFormat.CURRENCY_NO_DECIMALS,
  );

  const budgetText =
    remainingBudget < 0
      ? `Overspent: ${formattedRemainingAmount}`
      : `Remaining: ${formattedRemainingAmount}`;

  let budgetIntent: BadgeProps["color"];
  if (hasBudget) {
    if (remainingBudget < 0) {
      // Overspent
      budgetIntent = "danger";
    } else if (amountLimit > 0 && remainingBudget / amountLimit < 0.2) {
      // Less than 20% remaining
      budgetIntent = "warning";
    } else {
      // More than 20% remaining
      budgetIntent = "success";
    }
  }

  return {
    initialName: nameToInitials(category?.name ?? ""),
    name: category?.name ?? "",
    capitalizedName: capitalize(category?.name ?? ""),
    createdAt: category?.createdAt
      ? formatDate(category?.createdAt, DateFormat.LONG_DATE)
      : "",
    updatedAt: category?.updatedAt
      ? formatDate(category?.updatedAt, DateFormat.LONG_DATE)
      : "",
    variant,
    type: capitalize(category?.type),
    isIncome,
    isExpense,
    isTransfer,
    trimmedNotes,
    note,
    hasBudget,
    budgetText,
    budgetIntent,
  } as const;
};
