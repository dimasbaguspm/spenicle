import type { CategoryModel } from "@/types/schemas";
import { capitalize } from "lodash";
import { nameToInitials } from "../name-to-initial";
import { DateFormat, formatDate } from "../format-date";

export const formatCategoryData = (category: CategoryModel | null) => {
  const isIncome = category?.type === "income";
  const isExpense = category?.type === "expense";
  const isTransfer = category?.type === "transfer";

  const variant = isExpense ? "primary" : isIncome ? "secondary" : "tertiary";

  const trimmedNotes = category?.note
    ? `${category.note.slice(0, 25) + (category.note.length > 25 ? "..." : "")}`
    : "";
  const note = category?.note;

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
  } as const;
};
