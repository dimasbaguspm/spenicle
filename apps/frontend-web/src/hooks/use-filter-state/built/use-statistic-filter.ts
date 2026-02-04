import dayjs from "dayjs";
import {
  useFilterState,
  type UseFilterStateOptions,
  type UseFilterStateReturn,
} from "../base/use-filter-state";

export type StatisticPeriod = "3months" | "6months" | "1year";

export interface StatisticFilterModel {
  period?: StatisticPeriod;
}

export interface PeriodDates {
  startDate: string;
  endDate: string;
}

export const PERIOD_OPTIONS: { value: StatisticPeriod; label: string }[] = [
  { value: "3months", label: "Last 3 Months" },
  { value: "6months", label: "Last Semester" },
  { value: "1year", label: "Last Year" },
];

export interface UseStatisticFilterReturn extends UseFilterStateReturn<StatisticFilterModel> {
  appliedFilters: StatisticFilterModel;
  getPeriodDates: () => PeriodDates;
}

const statisticFilterModel = new Map<keyof StatisticFilterModel, string>([
  ["period", "Period"],
] as const);

export const statisticFilterModelKeys = Array.from(
  statisticFilterModel.keys(),
) as (keyof StatisticFilterModel)[];

const calculatePeriodDates = (period: string): PeriodDates => {
  const endDate = dayjs().endOf("month");
  let startDate: dayjs.Dayjs;

  switch (period) {
    case "3months":
      startDate = dayjs().startOf("month").subtract(2, "month");
      break;
    case "6months":
      startDate = dayjs().startOf("month").subtract(5, "month");
      break;
    case "1year":
      startDate = dayjs().startOf("month").subtract(11, "month");
      break;
    default:
      startDate = dayjs().startOf("month").subtract(2, "month");
  }

  return {
    startDate: startDate.toISOString(),
    endDate: endDate.toISOString(),
  };
};

export const useStatisticFilter = (
  options?: UseFilterStateOptions<StatisticFilterModel>,
): UseStatisticFilterReturn => {
  const filterState = useFilterState<StatisticFilterModel>(options);

  const appliedFilters: StatisticFilterModel = {
    period: (filterState.getSingle("period") as StatisticPeriod) || "3months",
  };

  return {
    ...filterState,
    appliedFilters,
    getPeriodDates: () =>
      calculatePeriodDates(appliedFilters.period || "3months"),
  };
};
