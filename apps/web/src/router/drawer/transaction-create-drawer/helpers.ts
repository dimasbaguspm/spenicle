import { DateFormat, formatDate } from "@/lib/format-date";
import type { TransactionCreateFormSchema } from "./types";
import dayjs from "dayjs";

export const formatDefaultValues = (
  payload?: Record<string, unknown>
): TransactionCreateFormSchema => {
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
};

export const extractDateTimeFromParams = (
  params: Record<string, string | undefined>
) => {
  if (!params.year || !params.month || !params.day) {
    return {};
  }

  const year = parseInt(params.year, 10);
  const month = parseInt(params.month, 10);
  const day = parseInt(params.day, 10);

  const date = dayjs().set("year", year).set("month", month).set("date", day);

  return {
    date: formatDate(date, DateFormat.ISO_DATE),
    time: formatDate(date, DateFormat.TIME_24H),
  };
};
