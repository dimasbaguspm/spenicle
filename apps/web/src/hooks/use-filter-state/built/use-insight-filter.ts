import type { InsightsTransactionsSearchModel } from "@/types/schemas";
import {
  useFilterState,
  type UseFilterStateOptions,
  type UseFilterStateReturn,
} from "../base/use-filter-state";
import dayjs from "dayjs";

export interface InsightFilterModel {
  startDate: InsightsTransactionsSearchModel["startDate"];
  endDate: InsightsTransactionsSearchModel["endDate"];
  frequency?: InsightsTransactionsSearchModel["frequency"];
}

export interface UseInsightFilterReturn
  extends UseFilterStateReturn<InsightsTransactionsSearchModel> {
  appliedFilters: InsightFilterModel;
  humanizedFilters: [keyof InsightFilterModel, string][];
}

const insightFilterModel = new Map<keyof InsightFilterModel, string>([
  ["startDate", "Start Date"],
  ["endDate", "End Date"],
  ["frequency", "Frequency"],
] as const);

export const insightFilterModelKeys = Array.from(
  insightFilterModel.keys()
) as (keyof InsightFilterModel)[];

export const useInsightFilter = (
  opts?: UseFilterStateOptions<InsightFilterModel>
): UseInsightFilterReturn => {
  const filters = useFilterState<InsightFilterModel>(opts);

  const appliedFilters: InsightFilterModel = {
    startDate:
      filters.getSingle("startDate") || dayjs().startOf("month").toISOString(),
    endDate:
      filters.getSingle("endDate") || dayjs().endOf("month").toISOString(),
  };

  const humanizedFilters = insightFilterModelKeys.reduce((acc, [key]) => {
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
  }, [] as [keyof InsightFilterModel, string][]);

  return {
    ...filters,
    appliedFilters,
    humanizedFilters,
    getSingle: (key: keyof InsightFilterModel) => filters.getSingle(key),
    getAll: (key: keyof InsightFilterModel) => filters.getAll(key),
    removeSingle: (key: keyof InsightFilterModel) => filters.removeSingle(key),
    removeAll: () => filters.removeAll(insightFilterModelKeys),
  };
};
