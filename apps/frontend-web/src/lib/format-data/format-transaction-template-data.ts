import { capitalize } from "lodash";
import { formatPrice, PriceFormat } from "../format-price";
import { DateFormat, formatDate } from "../format-date";
import type { TransactionTemplateModel } from "@/types/schemas";

export const formatTransactionTemplateData = (
  transactionTemplate: TransactionTemplateModel | null,
) => {
  const isIncome = transactionTemplate?.type === "income";
  const isExpense = transactionTemplate?.type === "expense";
  const isTransfer = transactionTemplate?.type === "transfer";
  const isInstallment = !!transactionTemplate?.endDate;

  const trimmedNotes = transactionTemplate?.note
    ? `${
        transactionTemplate.note.slice(0, 25) +
        (transactionTemplate.note.length > 25 ? "..." : "")
      }`
    : "";
  const note = transactionTemplate?.note;

  const variant = isIncome ? "secondary" : isExpense ? "primary" : "tertiary";
  const capitalizedType = capitalize(transactionTemplate?.type);
  const amount = formatPrice(
    transactionTemplate?.amount ?? 0,
    PriceFormat.CURRENCY_NO_DECIMALS,
  );

  const relatedAccountName = transactionTemplate?.account?.name ?? "";
  const relatedDestinationAccountName =
    transactionTemplate?.destinationAccount?.name ?? "";
  const relatedCategoryName = transactionTemplate?.category?.name ?? "";

  return {
    isIncome,
    isExpense,
    isTransfer,
    isInstallment,
    trimmedNotes,
    variant,
    capitalizedType,
    amount,
    note,
    relatedAccountName,
    relatedDestinationAccountName,
    relatedCategoryName,
    startDate: transactionTemplate?.startDate
      ? formatDate(transactionTemplate.startDate, DateFormat.LONG_DATE)
      : "",
    endDate: transactionTemplate?.endDate
      ? formatDate(transactionTemplate.endDate, DateFormat.LONG_DATE)
      : "",
    startDateTime: transactionTemplate?.startDate
      ? formatDate(transactionTemplate.startDate, DateFormat.MEDIUM_DATETIME)
      : "",
    endDateTime: transactionTemplate?.endDate
      ? formatDate(transactionTemplate.endDate, DateFormat.MEDIUM_DATETIME)
      : "",
    createdAt: transactionTemplate?.createdAt
      ? formatDate(transactionTemplate.createdAt, DateFormat.LONG_DATE)
      : "",
    updatedAt: transactionTemplate?.updatedAt
      ? formatDate(transactionTemplate.updatedAt, DateFormat.LONG_DATE)
      : "",
  } as const;
};
