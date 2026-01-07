export enum FilterInsightDateRangePresets {
  Last7Days = "last_7_days",
  Last30Days = "last_30_days",
  ThisMonth = "this_month",
  LastMonth = "last_month",
  ThisQuarter = "this_quarter",
  LastQuarter = "last_quarter",
  ThisYear = "this_year",
  LastYear = "last_year",
}

export enum FilterInsightFrequency {
  Daily = "daily",
  Weekly = "weekly",
  Monthly = "monthly",
  Yearly = "yearly",
}

export interface FilterInsightFormSchema {
  dateRangePreset: FilterInsightDateRangePresets | "custom";
  useCustomDateRange: boolean;
  customDateFrom: string | undefined;
  customDateTo: string | undefined;
  customFrequency: FilterInsightFrequency | undefined;
}
