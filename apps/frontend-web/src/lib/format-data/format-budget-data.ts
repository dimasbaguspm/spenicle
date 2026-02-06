import type { BudgetModel, BudgetTemplateModel } from "@/types/schemas";
import dayjs from "dayjs";
import { formatPrice, PriceFormat } from "../format-price";
import { DateFormat, formatDate } from "../format-date";
import type { BadgeProps } from "@dimasbaguspm/versaur";
import { startCase } from "lodash";

export const formatBudgetTemplateData = (data: BudgetTemplateModel | null) => {
  const formattedAmountLimit = formatPrice(
    data?.amountLimit || 0,
    PriceFormat.CURRENCY_NO_DECIMALS,
  );

  const startDate = data?.startDate
    ? formatDate(data.startDate, DateFormat.SHORT_DATE)
    : "";

  const endDate = data?.endDate
    ? formatDate(data.endDate, DateFormat.SHORT_DATE)
    : "";

  const nextRunAt = data?.nextRunAt
    ? formatDate(data.nextRunAt, DateFormat.SHORT_DATE)
    : "";

  const createdAt = data?.createdAt
    ? formatDate(data.createdAt, DateFormat.LONG_DATE)
    : "";

  const updatedAt = data?.updatedAt
    ? formatDate(data.updatedAt, DateFormat.LONG_DATE)
    : "";

  const isActive = data?.active ?? false;
  const activeText = isActive ? "Active" : "Inactive";
  const activeBadgeColor: BadgeProps["color"] = isActive
    ? "success"
    : "secondary";

  const recurrence = data?.recurrence ?? "none";
  const recurrenceLabel = recurrence === "none" ? "One-time" : recurrence;

  return {
    name: data?.name,
    recurrence,
    recurrenceLabel: startCase(recurrenceLabel),
    amountLimit: data?.amountLimit,
    formattedAmountLimit,
    startDate,
    endDate,
    nextRunAt,
    isActive,
    activeText,
    activeBadgeColor,
    note: data?.note,
    createdAt,
    updatedAt,
    accountId: data?.accountId,
    categoryId: data?.categoryId,
  } as const;
};

export const formatBudgetData = (data: BudgetModel | null) => {
  const isExpired = data ? dayjs().isAfter(dayjs(data.periodEnd)) : false;
  const isActive = data
    ? dayjs().isAfter(dayjs(data.periodStart)) &&
      dayjs().isBefore(dayjs(data.periodEnd))
    : false;

  const amountLimit = data?.amountLimit || 0;
  const actualAmount = data?.actualAmount || 0;
  const remainingBudget = amountLimit - actualAmount;
  const utilizationPercent =
    amountLimit > 0 ? (actualAmount / amountLimit) * 100 : 0;

  const formattedAmountLimit = formatPrice(
    amountLimit,
    PriceFormat.CURRENCY_NO_DECIMALS,
  );

  const formattedActualAmount = formatPrice(
    actualAmount,
    PriceFormat.CURRENCY_NO_DECIMALS,
  );

  const formattedRemainingAmount = formatPrice(
    Math.abs(remainingBudget),
    PriceFormat.CURRENCY_NO_DECIMALS,
  );

  const budgetStatusText =
    remainingBudget < 0
      ? `Overspent: ${formattedRemainingAmount}`
      : `Remaining: ${formattedRemainingAmount}`;

  let statusBadgeColor: BadgeProps["color"];
  if (isExpired) {
    statusBadgeColor = "secondary";
  } else if (remainingBudget < 0) {
    // Overspent
    statusBadgeColor = "danger";
  } else if (amountLimit > 0 && remainingBudget / amountLimit < 0.2) {
    // Less than 20% remaining
    statusBadgeColor = "warning";
  } else {
    // More than 20% remaining
    statusBadgeColor = "success";
  }

  const periodStart = data?.periodStart
    ? formatDate(data.periodStart, DateFormat.SHORT_DATE)
    : "";
  const periodEnd = data?.periodEnd
    ? formatDate(data.periodEnd, DateFormat.SHORT_DATE)
    : "";

  const createdAt = data?.createdAt
    ? formatDate(data.createdAt, DateFormat.LONG_DATE)
    : "";

  const updatedAt = data?.updatedAt
    ? formatDate(data.updatedAt, DateFormat.LONG_DATE)
    : "";

  return {
    name: data?.name,
    periodType: data?.periodType,
    periodStart,
    periodEnd,
    amountLimit: data?.amountLimit,
    actualAmount: data?.actualAmount,
    formattedAmountLimit,
    formattedActualAmount,
    formattedRemainingAmount,
    remainingBudget,
    utilizationPercent,
    budgetStatusText,
    statusBadgeColor,
    isExpired,
    isActive,
    note: data?.note,
    createdAt,
    updatedAt,
    accountId: data?.accountId,
    categoryId: data?.categoryId,
  } as const;
};
