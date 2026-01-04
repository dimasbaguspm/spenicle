import dayjs, { Dayjs } from "dayjs";

export const getDateRange = (
  currentDate: Dayjs,
  range: "month" | "week" | "twoWeeks"
): Dayjs[] => {
  const ranges: Dayjs[] = [];

  let startDate: Dayjs = dayjs();
  let endDate: Dayjs = dayjs();

  if (range === "month") {
    startDate = currentDate.startOf("month");
    endDate = currentDate.endOf("month");
  } else if (range === "twoWeeks") {
    // Group weeks into 3-week blocks based on the week position within the year.
    // This respects previous/next year positions by computing relative to the
    // year's first week-start. The group may span adjacent years.
    const GROUP_SIZE = 3;
    const yearFirstWeekStart = currentDate.startOf("year").startOf("week");
    const currentWeekStart = currentDate.startOf("week");

    // week index within the year (1-based)
    const weekIndex = currentWeekStart.diff(yearFirstWeekStart, "week") + 1;

    const groupStartIndex =
      Math.floor((weekIndex - 1) / GROUP_SIZE) * GROUP_SIZE + 1;
    const groupEndIndex = groupStartIndex + GROUP_SIZE - 1;

    startDate = yearFirstWeekStart
      .add(groupStartIndex - 1, "week")
      .startOf("week");
    endDate = yearFirstWeekStart.add(groupEndIndex - 1, "week").endOf("week");
  } else if (range === "week") {
    startDate = currentDate.startOf("week");
    endDate = currentDate.endOf("week");
  }

  // include endDate so the returned array is an inclusive contiguous range
  while (!startDate.isAfter(endDate)) {
    ranges.push(startDate);
    startDate = startDate.add(1, "day");
  }

  return ranges;
};
