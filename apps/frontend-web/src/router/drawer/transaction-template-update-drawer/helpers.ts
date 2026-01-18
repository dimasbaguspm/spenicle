import { DateFormat, formatDate } from "@/lib/format-date";
import type { TransactionTemplateUpdateFormSchema } from "./types";
import dayjs from "dayjs";
import { TransactionTemplateModel } from "@/types/schemas";

export const formatDefaultValues = (
  templateData: TransactionTemplateModel | null,
  payload?: Record<string, unknown>,
): TransactionTemplateUpdateFormSchema => {
  const isPayloadExist = payload && Object.keys(payload).length > 0;

  if (isPayloadExist) {
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
  } else {
    return {
      name: templateData ? templateData.name : "",
      startDate: templateData
        ? formatDate(dayjs(templateData.startDate), DateFormat.ISO_DATE)
        : formatDate(dayjs(), DateFormat.ISO_DATE),
      endDate: templateData
        ? templateData.endDate
          ? formatDate(dayjs(templateData.endDate), DateFormat.ISO_DATE)
          : undefined
        : undefined,
      recurrence: templateData
        ? (templateData.recurrence as TransactionTemplateUpdateFormSchema["recurrence"])
        : "none",
      type: templateData
        ? (templateData.type as TransactionTemplateUpdateFormSchema["type"])
        : "expense",
      accountId: templateData ? templateData.account?.id : 0,
      destinationAccountId: templateData
        ? templateData.destinationAccount?.id || undefined
        : undefined,
      categoryId: templateData ? templateData.category?.id : 0,
      amount: templateData ? templateData.amount : 0,
      notes: templateData ? templateData.note || "" : "",
    };
  }
};
