import type { AccountModel } from "@/types/schemas";
import { capitalize } from "lodash";
import { nameToInitials } from "../name-to-initial";
import { DateFormat, formatDate } from "../format-date";
import { formatPrice, PriceFormat } from "../format-price";

export const formatAccountData = (data: AccountModel | null) => {
  const isExpense = data?.type === "expense";
  const variant = isExpense ? "primary" : "secondary";

  const trimmedNotes = data?.note
    ? `${data.note.slice(0, 25) + (data.note.length > 25 ? "..." : "")}`
    : "";
  const note = data?.note;

  return {
    name: data?.name,
    initialName: nameToInitials(data?.name ?? ""),
    capitalizedName: capitalize(data?.name),
    formattedAmount: formatPrice(
      data?.amount ?? 0,
      isExpense ? PriceFormat.CURRENCY : PriceFormat.CURRENCY_NO_DECIMALS
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
  } as const;
};
