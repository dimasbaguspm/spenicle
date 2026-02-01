import type { InsightsTransactionsSearchModel } from "@/types/schemas";
import {
  useFilterState,
  type UseFilterStateOptions,
  type UseFilterStateReturn,
} from "../base/use-filter-state";
import dayjs from "dayjs";

export type DateRangeOption =
  | "last-3-months"
  | "last-quarter"
  | "this-year"
  | "last-5-years"
  | "last-10-years";

export interface InsightFilterModel {
  startDate: InsightsTransactionsSearchModel["startDate"];
  endDate: InsightsTransactionsSearchModel["endDate"];
  frequency?: InsightsTransactionsSearchModel["frequency"];
}

export interface UseInsightFilterReturn extends UseFilterStateReturn<InsightsTransactionsSearchModel> {
  appliedFilters: InsightFilterModel;
  humanizedFilters: [keyof InsightFilterModel, string][];
  currentRange: DateRangeOption;
  setRange: (range: DateRangeOption) => void;
}

const insightFilterModel = new Map<keyof InsightFilterModel, string>([
  ["startDate", "Start Date"],
  ["endDate", "End Date"],
  ["frequency", "Frequency"],
] as const);

export const insightFilterModelKeys = Array.from(
  insightFilterModel.keys(),
) as (keyof InsightFilterModel)[];

const getDateRangeFromOption = (option: DateRangeOption) => {
  const now = dayjs();

  switch (option) {
    case "last-3-months":
      return {
        startDate: now.subtract(3, "month").startOf("month").toISOString(),
        endDate: now.endOf("month").toISOString(),
      };
    case "last-quarter":
      // Calculate last quarter manually (3 months ago, start of that quarter)
      const lastQuarterStart = now.subtract(3, "month").startOf("month");
      const lastQuarterEnd = lastQuarterStart.add(2, "month").endOf("month");
      return {
        startDate: lastQuarterStart.toISOString(),
        endDate: lastQuarterEnd.toISOString(),
      };
    case "this-year":
      return {
        startDate: now.startOf("year").toISOString(),
        endDate: now.endOf("year").toISOString(),
      };
    case "last-5-years":
      return {
        startDate: now.subtract(5, "year").startOf("year").toISOString(),
        endDate: now.endOf("year").toISOString(),
      };
    case "last-10-years":
      return {
        startDate: now.subtract(10, "year").startOf("year").toISOString(),
        endDate: now.endOf("year").toISOString(),
      };
    default:
      return {
        startDate: now.subtract(3, "month").startOf("month").toISOString(),
        endDate: now.endOf("month").toISOString(),
      };
  }
};

const getDefaultFrequencyForRange = (
  option: DateRangeOption,
): "daily" | "weekly" | "monthly" | "yearly" => {
  switch (option) {
    case "last-3-months":
      return "weekly";
    case "last-quarter":
      return "weekly";
    case "this-year":
      return "monthly";
    case "last-5-years":
      return "yearly";
    case "last-10-years":
      return "yearly";
    default:
      return "weekly";
  }
};

const getCurrentRangeOption = (
  startDate: string,
  endDate: string,
): DateRangeOption => {
  const start = dayjs(startDate);
  const end = dayjs(endDate);
  const now = dayjs();

  // Check last-3-months
  const last3MonthsStart = now.subtract(3, "month").startOf("month");
  const last3MonthsEnd = now.endOf("month");
  if (
    start.isSame(last3MonthsStart, "month") &&
    end.isSame(last3MonthsEnd, "month")
  ) {
    return "last-3-months";
  }

  // Check last-quarter
  const lastQuarterStart = now.subtract(3, "month").startOf("month");
  const lastQuarterEnd = lastQuarterStart.add(2, "month").endOf("month");
  if (
    start.isSame(lastQuarterStart, "month") &&
    end.isSame(lastQuarterEnd, "month")
  ) {
    return "last-quarter";
  }

  // Check this-year
  const thisYearStart = now.startOf("year");
  const thisYearEnd = now.endOf("year");
  if (start.isSame(thisYearStart, "year") && end.isSame(thisYearEnd, "year")) {
    return "this-year";
  }

  // Check last-5-years
  const last5YearsStart = now.subtract(5, "year").startOf("year");
  const last5YearsEnd = now.endOf("year");
  if (
    start.isSame(last5YearsStart, "year") &&
    end.isSame(last5YearsEnd, "year")
  ) {
    return "last-5-years";
  }

  // Check last-10-years
  const last10YearsStart = now.subtract(10, "year").startOf("year");
  const last10YearsEnd = now.endOf("year");
  if (
    start.isSame(last10YearsStart, "year") &&
    end.isSame(last10YearsEnd, "year")
  ) {
    return "last-10-years";
  }

  // Default to last-3-months
  return "last-3-months";
};

export const useInsightFilter = (
  opts?: UseFilterStateOptions<InsightFilterModel>,
): UseInsightFilterReturn => {
  const filters = useFilterState<InsightFilterModel>(opts);

  const appliedFilters: InsightFilterModel = {
    startDate:
      filters.getSingle("startDate") || dayjs().startOf("month").toISOString(),
    endDate:
      filters.getSingle("endDate") || dayjs().endOf("month").toISOString(),
    frequency:
      (filters.getSingle("frequency") as
        | "daily"
        | "weekly"
        | "monthly"
        | "yearly") || "weekly",
  };

  const humanizedFilters = insightFilterModelKeys.reduce(
    (acc, [key]) => {
      const typedKey = key as keyof InsightFilterModel;
      switch (typedKey) {
        case "startDate":
          if (appliedFilters.startDate) {
            acc.push([typedKey, appliedFilters.startDate]);
          }
          break;
        case "endDate":
          if (appliedFilters.endDate) {
            acc.push([typedKey, appliedFilters.endDate]);
          }
          break;
        case "frequency":
          if (appliedFilters.frequency) {
            acc.push([typedKey, appliedFilters.frequency]);
          }
          break;
      }
      return acc;
    },
    [] as [keyof InsightFilterModel, string][],
  );

  const currentRange = getCurrentRangeOption(
    appliedFilters.startDate,
    appliedFilters.endDate,
  );

  const setRange = (range: DateRangeOption) => {
    const { startDate, endDate } = getDateRangeFromOption(range);
    const frequency = getDefaultFrequencyForRange(range);
    filters.replaceAll({ startDate, endDate, frequency });
  };

  return {
    ...filters,
    appliedFilters,
    humanizedFilters,
    currentRange,
    setRange,
    getSingle: (key: keyof InsightFilterModel) => filters.getSingle(key),
    getAll: (key: keyof InsightFilterModel) => filters.getAll(key),
    removeSingle: (key: keyof InsightFilterModel) => filters.removeSingle(key),
    removeAll: () => filters.removeAll(insightFilterModelKeys),
  };
};
