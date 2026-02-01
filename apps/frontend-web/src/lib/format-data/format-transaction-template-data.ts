import { capitalize, startCase } from "lodash";
import { formatPrice, PriceFormat } from "../format-price";
import { DateFormat, formatDate } from "../format-date";
import type { TransactionTemplateModel } from "@/types/schemas";

export const formatTransactionTemplateData = (
  data: TransactionTemplateModel | null,
) => {
  const isIncome = data?.type === "income";
  const isExpense = data?.type === "expense";
  const isTransfer = data?.type === "transfer";
  const isInstallment = !!data?.endDate;

  const trimmedNotes = data?.note
    ? `${data.note.slice(0, 25) + (data.note.length > 25 ? "..." : "")}`
    : "";
  const note = data?.note;

  const variant = isIncome ? "secondary" : isExpense ? "primary" : "tertiary";
  const capitalizedType = capitalize(data?.type);
  const amount = formatPrice(
    data?.amount ?? 0,
    PriceFormat.CURRENCY_NO_DECIMALS,
  );

  const relatedAccountName = data?.account?.name ?? "";
  const relatedDestinationAccountName = data?.destinationAccount?.name ?? "";
  const relatedCategoryName = data?.category?.name ?? "";

  const recurs = startCase(data?.recurrence ?? "N/A");
  const occurrences = data?.recurringStats?.occurrences ?? 0;
  const remainingOccurrences = data?.recurringStats?.remaining ?? 0;
  const isCompleted = remainingOccurrences === 0 && occurrences > 0;

  const name = data?.name ?? "";

  return {
    name,
    isIncome,
    isExpense,
    isTransfer,
    isInstallment,
    trimmedNotes,
    variant,
    capitalizedType,
    amount,
    note,
    recurs,
    relatedAccountName,
    relatedDestinationAccountName,
    relatedCategoryName,
    occurrences,
    remainingOccurrences,
    isCompleted,
    nextRunDate: data?.nextDueAt
      ? formatDate(data.nextDueAt, DateFormat.LONG_DATE)
      : "",
    nextRunDateTime: data?.nextDueAt
      ? formatDate(data.nextDueAt, DateFormat.MEDIUM_DATETIME)
      : "",
    nextRunHumanized: data?.nextDueAt
      ? formatDate(data.nextDueAt, DateFormat.RELATIVE)
      : "",
    startDate: data?.startDate
      ? formatDate(data.startDate, DateFormat.LONG_DATE)
      : "",
    endDate: data?.endDate
      ? formatDate(data.endDate, DateFormat.LONG_DATE)
      : "",
    startDateTime: data?.startDate
      ? formatDate(data.startDate, DateFormat.MEDIUM_DATETIME)
      : "",
    endDateTime: data?.endDate
      ? formatDate(data.endDate, DateFormat.MEDIUM_DATETIME)
      : "",
    createdAt: data?.createdAt
      ? formatDate(data.createdAt, DateFormat.LONG_DATE)
      : "",
    updatedAt: data?.updatedAt
      ? formatDate(data.updatedAt, DateFormat.LONG_DATE)
      : "",
  } as const;
};
