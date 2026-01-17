import dayjs from "dayjs";
import type { InsightFilterModel } from "@/hooks/use-filter-state/built/use-insight-filter";
import {
  FilterInsightDateRangePresets,
  FilterInsightFrequency,
  type FilterInsightFormSchema,
} from "./types";
import { DateFormat, formatDate } from "@/lib/format-date";

interface ExtractedDateRange {
  dateFrom: string;
  dateTo: string;
  frequency: FilterInsightFrequency;
}

/**
 * Extracts date range and frequency from a preset value
 * @param preset - The date range preset to extract
 * @returns An object containing dateFrom (ISO string), dateTo (ISO string), and frequency
 */
export const extractDateRangeFromPreset = (
  preset: FilterInsightDateRangePresets | "custom"
): ExtractedDateRange => {
  const now = dayjs();
  let dateFrom: dayjs.Dayjs;
  let dateTo: dayjs.Dayjs;
  let frequency: FilterInsightFrequency;

  switch (preset) {
    case FilterInsightDateRangePresets.Last7Days:
      dateFrom = now.subtract(7, "days").startOf("day");
      dateTo = now.endOf("day");
      frequency = FilterInsightFrequency.Daily;
      break;

    case FilterInsightDateRangePresets.Last30Days:
      dateFrom = now.subtract(30, "days").startOf("day");
      dateTo = now.endOf("day");
      frequency = FilterInsightFrequency.Weekly;
      break;

    case FilterInsightDateRangePresets.ThisMonth:
      dateFrom = now.startOf("month");
      dateTo = now.endOf("month");
      frequency = FilterInsightFrequency.Weekly;
      break;

    case FilterInsightDateRangePresets.LastMonth:
      dateFrom = now.subtract(1, "month").startOf("month");
      dateTo = now.subtract(1, "month").endOf("month");
      frequency = FilterInsightFrequency.Weekly;
      break;

    case FilterInsightDateRangePresets.ThisQuarter:
      // Calculate current quarter manually (Q1: Jan-Mar, Q2: Apr-Jun, Q3: Jul-Sep, Q4: Oct-Dec)
      const currentMonth = now.month();
      const quarterStartMonth = Math.floor(currentMonth / 3) * 3;
      dateFrom = now.month(quarterStartMonth).startOf("month");
      dateTo = now.month(quarterStartMonth + 2).endOf("month");
      frequency = FilterInsightFrequency.Monthly;
      break;

    case FilterInsightDateRangePresets.LastQuarter:
      // Calculate last quarter manually
      const lastQuarterMonth = now.subtract(3, "month").month();
      const lastQuarterStartMonth = Math.floor(lastQuarterMonth / 3) * 3;
      dateFrom = now
        .subtract(3, "month")
        .month(lastQuarterStartMonth)
        .startOf("month");
      dateTo = now
        .subtract(3, "month")
        .month(lastQuarterStartMonth + 2)
        .endOf("month");
      frequency = FilterInsightFrequency.Monthly;
      break;

    case FilterInsightDateRangePresets.ThisYear:
      dateFrom = now.startOf("year");
      dateTo = now.endOf("year");
      frequency = FilterInsightFrequency.Monthly;
      break;

    case FilterInsightDateRangePresets.LastYear:
      dateFrom = now.subtract(1, "year").startOf("year");
      dateTo = now.subtract(1, "year").endOf("year");
      frequency = FilterInsightFrequency.Monthly;
      break;

    default:
      // Fallback to last 30 days
      dateFrom = now.subtract(30, "days").startOf("day");
      dateTo = now.endOf("day");
      frequency = FilterInsightFrequency.Weekly;
  }

  return {
    dateFrom: dateFrom.toISOString(),
    dateTo: dateTo.toISOString(),
    frequency,
  };
};

/**
 * Converts InsightFilterModel to FilterInsightFormSchema
 * @param filters - The InsightFilterModel to convert
 * @returns FilterInsightFormSchema for form usage
 */
export const convertInsightFilterToFormSchema = (
  filters: InsightFilterModel
): FilterInsightFormSchema => {
  const hasCustomDates = !!(filters.startDate && filters.endDate);

  // If no dates provided, use default preset
  if (!hasCustomDates) {
    return {
      dateRangePreset: FilterInsightDateRangePresets.Last30Days,
      useCustomDateRange: false,
      customDateFrom: undefined,
      customDateTo: undefined,
      customFrequency: undefined,
    };
  }

  // Check if the dates match any preset
  const allPresets = [
    FilterInsightDateRangePresets.Last7Days,
    FilterInsightDateRangePresets.Last30Days,
    FilterInsightDateRangePresets.ThisMonth,
    FilterInsightDateRangePresets.LastMonth,
    FilterInsightDateRangePresets.ThisQuarter,
    FilterInsightDateRangePresets.LastQuarter,
    FilterInsightDateRangePresets.ThisYear,
    FilterInsightDateRangePresets.LastYear,
  ];

  for (const preset of allPresets) {
    const presetRange = extractDateRangeFromPreset(preset);
    const startMatches = dayjs(filters.startDate).isSame(
      presetRange.dateFrom,
      "day"
    );
    const endMatches = dayjs(filters.endDate).isSame(presetRange.dateTo, "day");

    if (startMatches && endMatches) {
      return {
        dateRangePreset: preset,
        useCustomDateRange: false,
        customDateFrom: formatDate(filters.startDate, DateFormat.ISO_DATE),
        customDateTo: formatDate(filters.endDate, DateFormat.ISO_DATE),
        customFrequency: undefined,
      };
    }
  }

  // If no preset matches, it's a custom date range
  return {
    dateRangePreset: "custom",
    useCustomDateRange: true,
    customDateFrom: filters.startDate,
    customDateTo: filters.endDate,
    customFrequency: filters.frequency as FilterInsightFrequency | undefined,
  };
};
