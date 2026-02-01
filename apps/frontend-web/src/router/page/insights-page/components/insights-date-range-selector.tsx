import {
  useInsightFilter,
  type DateRangeOption,
} from "@/hooks/use-filter-state";
import { ChipSingleInput } from "@dimasbaguspm/versaur";

export const InsightsDateRangeSelector = () => {
  const { currentRange, setRange } = useInsightFilter();

  const handleRangeChange = (value: string) => {
    setRange(value as DateRangeOption);
  };

  return (
    <div className="w-full overflow-x-auto mt-4 ">
      <div className="flex gap-2 min-w-max">
        <ChipSingleInput
          name="date-range"
          className="border-0 p-0 m-0 bg-transparent"
          value={currentRange}
          onChange={handleRangeChange}
        >
          <ChipSingleInput.Option value="last-semester">
            Last Semester
          </ChipSingleInput.Option>
          <ChipSingleInput.Option value="last-3-months">
            Last 3 Months
          </ChipSingleInput.Option>
          <ChipSingleInput.Option value="last-quarter">
            Last Quarter
          </ChipSingleInput.Option>
          <ChipSingleInput.Option value="this-year">
            This Year
          </ChipSingleInput.Option>
          <ChipSingleInput.Option value="last-5-years">
            Last 5 Years
          </ChipSingleInput.Option>
          <ChipSingleInput.Option value="last-10-years">
            Last 10 Years
          </ChipSingleInput.Option>
        </ChipSingleInput>
      </div>
    </div>
  );
};
