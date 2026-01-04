import { capitalize } from "lodash";
import { formatPrice, PriceFormat } from "../format-price";
import { DateFormat, formatDate } from "../format-date";
import type { TransactionModel } from "@/types/schemas";

export const formatTransactionData = (transaction: TransactionModel | null) => {
  const isIncome = transaction?.type === "income";
  const isExpense = transaction?.type === "expense";
  const isTransfer = transaction?.type === "transfer";

  const trimmedNotes = transaction?.note
    ? `${
        transaction.note.slice(0, 25) +
        (transaction.note.length > 25 ? "..." : "")
      }`
    : "";
  const note = transaction?.note;

  const variant = isIncome ? "secondary" : isExpense ? "primary" : "tertiary";
  const capitalizedType = capitalize(transaction?.type);
  const amount = formatPrice(transaction?.amount ?? 0, PriceFormat.CURRENCY);

  return {
    isIncome,
    isExpense,
    isTransfer,
    trimmedNotes,
    variant,
    capitalizedType,
    amount,
    note,
    time: transaction?.date
      ? formatDate(transaction.date, DateFormat.TIME_24H)
      : "",
    date: transaction?.date
      ? formatDate(transaction.date, DateFormat.LONG_DATE)
      : "",
    dateTime: transaction?.date
      ? formatDate(transaction.date, DateFormat.MEDIUM_DATETIME)
      : "",
    createdAt: transaction?.createdAt
      ? formatDate(transaction.createdAt, DateFormat.LONG_DATE)
      : "",
    updatedAt: transaction?.updatedAt
      ? formatDate(transaction.updatedAt, DateFormat.LONG_DATE)
      : "",
  } as const;
};
