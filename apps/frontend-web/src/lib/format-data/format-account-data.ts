import type { AccountModel } from "@/types/schemas";
import { capitalize } from "lodash";
import { nameToInitials } from "../name-to-initial";
import { DateFormat, formatDate } from "../format-date";
import { formatPrice, PriceFormat } from "../format-price";
import { BadgeProps } from "@dimasbaguspm/versaur";

export const formatAccountData = (data: AccountModel | null) => {
  const isExpense = data?.type === "expense";
  const variant = isExpense ? "primary" : "secondary";

  const trimmedNotes = data?.note
    ? `${data.note.slice(0, 25) + (data.note.length > 25 ? "..." : "")}`
    : "";
  const note = data?.note;

  const hasBudget = !!data?.budget;
  const amountLimit = data?.budget?.amountLimit || 0;
  const actualAmount = data?.budget?.actualAmount || 0;
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
    name: data?.name,
    initialName: nameToInitials(data?.name ?? ""),
    capitalizedName: capitalize(data?.name),
    formattedAmount: formatPrice(
      data?.amount ?? 0,
      PriceFormat.CURRENCY_NO_DECIMALS,
    ),
    createdAt: data?.createdAt
      ? formatDate(data?.createdAt, DateFormat.LONG_DATE)
      : "",
    updatedAt: data?.updatedAt
      ? formatDate(data?.updatedAt, DateFormat.LONG_DATE)
      : "",
    type: capitalize(data?.type),
    order: data?.displayOrder,
    amount: data?.amount,
    isExpense,
    variant,
    notes: note,
    trimmedNotes,
    hasBudget,
    budgetText,
    budgetIntent,
  } as const;
};
