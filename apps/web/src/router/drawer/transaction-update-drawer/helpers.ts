import { DateFormat, formatDate } from "@/lib/format-date";
import type { TransactionUpdateFormSchema } from "./types";
import dayjs from "dayjs";
import type { TransactionModel } from "@/types/schemas";

export const formatDefaultValues = (
  transaction: TransactionModel | null,
  payload?: Record<string, unknown>
): TransactionUpdateFormSchema => {
  const isPayloadExist = payload && Object.keys(payload).length > 0;

  if (isPayloadExist) {
    return {
      type:
        payload?.type === "expense" ||
        payload?.type === "income" ||
        payload?.type === "transfer"
          ? payload.type
          : "expense",
      date:
        typeof payload?.date === "string"
          ? payload.date
          : formatDate(dayjs(), DateFormat.ISO_DATE),
      time:
        typeof payload?.time === "string"
          ? payload?.time
          : formatDate(dayjs(), DateFormat.TIME_24H),
      accountId:
        payload?.accountId &&
        typeof payload?.accountId === "number" &&
        !isNaN(+payload?.accountId)
          ? (+payload?.accountId as number)
          : 0,
      destinationAccountId:
        payload?.destinationAccountId &&
        typeof payload?.destinationAccountId === "number" &&
        !isNaN(+payload?.destinationAccountId)
          ? (+payload?.destinationAccountId as number)
          : undefined,
      categoryId:
        payload?.categoryId &&
        typeof payload?.categoryId === "number" &&
        !isNaN(+payload?.categoryId)
          ? (+payload?.categoryId as number)
          : 0,
      amount:
        payload?.amount &&
        !isNaN(+payload?.amount) &&
        typeof payload?.amount === "number"
          ? (+payload?.amount as number)
          : 0,
      notes: typeof payload?.notes === "string" ? payload?.notes : "",
    };
  } else {
    return {
      type: transaction
        ? (transaction.type as TransactionUpdateFormSchema["type"])
        : "expense",
      date: transaction
        ? formatDate(dayjs(transaction.date), DateFormat.ISO_DATE)
        : formatDate(dayjs(), DateFormat.ISO_DATE),
      time: transaction
        ? formatDate(dayjs(transaction.date), DateFormat.TIME_24H)
        : formatDate(dayjs(), DateFormat.TIME_24H),
      accountId: transaction ? transaction.accountId : 0,
      destinationAccountId: transaction
        ? transaction.destinationAccountId || undefined
        : undefined,
      categoryId: transaction ? transaction.categoryId : 0,
      amount: transaction ? transaction.amount : 0,
      notes: transaction ? transaction.note || "" : "",
    };
  }
};

export const extractDateTimeFromParams = (
  params: Record<string, string | undefined>
) => {
  const year = params.year ? parseInt(params.year, 10) : dayjs().year();
  const month = params.month ? parseInt(params.month, 10) : dayjs().month();
  const day = params.day ? parseInt(params.day, 10) : dayjs().date();

  const date = dayjs().set("year", year).set("month", month).set("date", day);

  return {
    date: formatDate(date, DateFormat.ISO_DATE),
    time: formatDate(date, DateFormat.TIME_24H),
  };
};
