import { DateFormat, formatDate } from "@/lib/format-date";
import { Tabs, Text, useDesktopBreakpoint } from "@dimasbaguspm/versaur";
import dayjs, { Dayjs } from "dayjs";
import { useMemo, type FC } from "react";
import { getDateRange } from "../helpers";

interface TabsDateProps {
  date: Dayjs;
  onDateChange: (date: Dayjs) => void;
}

export const TabsDate: FC<TabsDateProps> = ({ date, onDateChange }) => {
  const isDesktop = useDesktopBreakpoint();

  const dates = useMemo(
    () => getDateRange(date, isDesktop ? "twoWeeks" : "week"),
    [date, isDesktop]
  );

  const handleTabChange = (date: string) => {
    onDateChange(dayjs(date));
  };

  return (
    <Tabs
      value={formatDate(date.toDate(), DateFormat.ISO_DATE)}
      onValueChange={handleTabChange}
      fullWidth
    >
      {dates.map((mappedDate) => {
        const isActive = date.isSame(mappedDate, "day");

        return (
          <Tabs.Trigger
            key={mappedDate.toString()}
            value={formatDate(mappedDate.toISOString(), DateFormat.ISO_DATE)}
            className="flex flex-col hover:text-primary"
          >
            <Text
              as="small"
              align="center"
              color={isActive ? "primary" : "inherit"}
            >
              {formatDate(mappedDate.toISOString(), DateFormat.SHORT_DAY)}
            </Text>
            {formatDate(mappedDate.toISOString(), DateFormat.NUMERIC_DAY)}
          </Tabs.Trigger>
        );
      })}
    </Tabs>
  );
};
