import { DateFormat, formatDate } from "@/lib/format-date";
import type { TransactionTemplateCreateFormSchema } from "./types";
import dayjs from "dayjs";

export const formatDefaultValues = (
  payload?: Record<string, unknown>,
): TransactionTemplateCreateFormSchema => {
  return {
    name: typeof payload?.name === "string" ? payload?.name : "",
    startDate:
      payload?.startDate && typeof payload?.startDate === "string"
        ? payload.startDate
        : formatDate(dayjs(), DateFormat.ISO_DATE),
    endDate:
      payload?.endDate && typeof payload?.endDate === "string"
        ? payload.endDate
        : undefined,
    recurrence:
      payload?.recurrence === "none" ||
      payload?.recurrence === "weekly" ||
      payload?.recurrence === "monthly" ||
      payload?.recurrence === "yearly"
        ? payload.recurrence
        : "none",
    type:
      payload?.type === "expense" ||
      payload?.type === "income" ||
      payload?.type === "transfer"
        ? payload.type
        : "expense",

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
