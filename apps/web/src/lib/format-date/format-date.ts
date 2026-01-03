import dayjs, { Dayjs } from "dayjs";
import advancedFormat from "dayjs/plugin/advancedFormat";
import localizedFormat from "dayjs/plugin/localizedFormat";
import relativeTime from "dayjs/plugin/relativeTime";

// Configure dayjs plugins
dayjs.extend(relativeTime);
dayjs.extend(advancedFormat);
dayjs.extend(localizedFormat);

/**
 * Date format types enum for type safety
 */
export const DateFormat = {
  // Relative/Humanized formats
  /**
   * Relative format with words. Example: "2 hours ago" or "in 3 days".
   */
  RELATIVE: "relative",

  /**
   * Relative time without suffix. Example: "2 hours" or "3 days".
   */
  RELATIVE_FROM_NOW: "relativeFromNow",

  /**
   * Alias for relative/humanized time. Example: "2 hours ago".
   */
  TIME_AGO: "timeAgo",

  // Common readable formats
  /** Example: "Monday, January 15, 2024" */
  FULL_DATE: "fullDate",

  /** Example: "01/15/2024" */
  SHORT_DATE: "shortDate",

  /** Example: "Jan 15, 2024" */
  MEDIUM_DATE: "mediumDate",

  /** Example: "January 15, 2024" */
  LONG_DATE: "longDate",

  // Date with time
  /** Example: "Monday, January 15, 2024 at 2:30 PM" */
  FULL_DATETIME: "fullDateTime",

  /** Example: "01/15/2024 2:30 PM" */
  SHORT_DATETIME: "shortDateTime",

  /** Example: "Jan 15, 2024 2:30 PM" */
  MEDIUM_DATETIME: "mediumDateTime",

  /** Example: "January 15, 2024 2:30 PM" */
  LONG_DATETIME: "longDateTime",

  // Time only
  /** Example: "2:30 PM" */
  TIME_12H: "time12h",

  /** Example: "14:30" */
  TIME_24H: "time24h",

  // ISO formats
  /** Example: "2024-01-15" */
  ISO_DATE: "isoDate",

  /** Example: "2024-01-15T14:30:00.000Z" */
  ISO_DATETIME: "isoDateTime",

  // Custom readable formats
  /**
   * Friendly label when near current date. Examples: "Today", "Yesterday", "Tomorrow".
   */
  FRIENDLY_DATE: "friendlyDate",

  /** Example: "1/15/24" */
  COMPACT_DATE: "compactDate",

  /** Example: "Monday, Jan 15" */
  WEEKDAY_DATE: "weekdayDate",

  /** Example: "January 2024" */
  MONTH_YEAR: "monthYear",

  // New granular variants
  /** Short weekday name. Example: "Mon" */
  SHORT_DAY: "shortDay",

  /** Full weekday name. Example: "Monday" */
  DAY: "day",

  /** Short month name. Example: "Jan" */
  SHORT_MONTH: "shortMonth",

  /** Short month and year. Example: "Jan 2024" */
  SHORT_MONTH_YEAR: "shortMonthYear",

  /** Full month name. Example: "January" */
  MONTH: "month",

  // Additional useful formats
  /** Ordinal day of month. Example: "1st", "2nd", "3rd" */
  ORDINAL_DAY: "ordinalDay",

  /** Day + short month. Example: "15 Jan" */
  DAY_MONTH: "dayMonth",

  /** Day + month + year. Example: "15 Jan 2024" */
  DAY_MONTH_YEAR: "dayMonthYear",

  /** Month + day. Example: "January 15" */
  MONTH_DAY: "monthDay",

  /** Dot-separated date. Example: "15.01.2024" */
  DOT_DATE: "dotDate",

  /** Numeric month. Example: "1" .. "12" */
  NUMERIC_MONTH: "numericMonth",

  /** Numeric day of month. Example: "1" .. "31" */
  NUMERIC_DAY: "numericDay",

  /** Year only. Example: "2024" */
  YEAR: "year",

  /** Short date-time with seconds. Example: "01/15/2024 2:30:45 PM" */
  SHORT_DATETIME_SECONDS: "shortDateTimeSeconds",

  /** 24-hour time with seconds. Example: "14:30:45" */
  TIME_24H_SECONDS: "time24hSeconds",
} as const;

export type DateFormatType = (typeof DateFormat)[keyof typeof DateFormat];

/**
 * Formats a date using various humanized and readable formats
 * @param date - The date to format (Date object or string)
 * @param format - The format type to use
 * @returns Formatted date string
 */
export function formatDate(
  date: Dayjs | Date | string,
  format: DateFormatType
): string {
  const dayjsDate = dayjs(date);

  if (!dayjsDate.isValid()) {
    throw new Error("Invalid date provided");
  }

  switch (format) {
    // Relative/Humanized formats
    case DateFormat.RELATIVE:
      return dayjsDate.fromNow(); // "2 hours ago", "in 3 days"

    case DateFormat.RELATIVE_FROM_NOW:
      return dayjsDate.fromNow(true); // "2 hours", "3 days" (without "ago" or "in")

    case DateFormat.TIME_AGO:
      return dayjsDate.fromNow(); // Same as relative but more explicit naming

    // Common readable formats
    case DateFormat.FULL_DATE:
      return dayjsDate.format("dddd, MMMM D, YYYY"); // "Monday, January 15, 2024"

    case DateFormat.SHORT_DATE:
      return dayjsDate.format("MM/DD/YYYY"); // "01/15/2024"

    case DateFormat.MEDIUM_DATE:
      return dayjsDate.format("MMM D, YYYY"); // "Jan 15, 2024"

    case DateFormat.LONG_DATE:
      return dayjsDate.format("MMMM D, YYYY"); // "January 15, 2024"

    // Date with time
    case DateFormat.FULL_DATETIME:
      return dayjsDate.format("dddd, MMMM D, YYYY [at] h:mm A"); // "Monday, January 15, 2024 at 2:30 PM"

    case DateFormat.SHORT_DATETIME:
      return dayjsDate.format("MM/DD/YYYY h:mm A"); // "01/15/2024 2:30 PM"

    case DateFormat.MEDIUM_DATETIME:
      return dayjsDate.format("MMM D, YYYY h:mm A"); // "Jan 15, 2024 2:30 PM"

    case DateFormat.LONG_DATETIME:
      return dayjsDate.format("MMMM D, YYYY h:mm A"); // "January 15, 2024 2:30 PM"

    // Time only
    case DateFormat.TIME_12H:
      return dayjsDate.format("h:mm A"); // "2:30 PM"

    case DateFormat.TIME_24H:
      return dayjsDate.format("HH:mm"); // "14:30"

    // ISO formats
    case DateFormat.ISO_DATE:
      return dayjsDate.format("YYYY-MM-DD"); // "2024-01-15"

    case DateFormat.ISO_DATETIME:
      return dayjsDate.toISOString(); // "2024-01-15T14:30:00.000Z"

    // Custom readable formats
    case DateFormat.FRIENDLY_DATE: {
      const now = dayjs();
      const diffDays = now.diff(dayjsDate, "day");

      if (diffDays === 0) return "Today";
      if (diffDays === 1) return "Yesterday";
      if (diffDays === -1) return "Tomorrow";
      if (diffDays > 0 && diffDays <= 7) return dayjsDate.fromNow();
      return dayjsDate.format("MMM D, YYYY");
    }

    case DateFormat.COMPACT_DATE:
      return dayjsDate.format("M/D/YY"); // "1/15/24"

    case DateFormat.WEEKDAY_DATE:
      return dayjsDate.format("dddd, MMM D"); // "Monday, Jan 15"

    case DateFormat.MONTH_YEAR:
      return dayjsDate.format("MMMM YYYY"); // "January 2024"

    case DateFormat.SHORT_MONTH_YEAR:
      return dayjsDate.format("MMM YYYY"); // "Jan 2024"

    // Granular new variants
    case DateFormat.SHORT_DAY:
      return dayjsDate.format("ddd"); // "Mon"

    case DateFormat.DAY:
      return dayjsDate.format("dddd"); // "Monday"

    case DateFormat.SHORT_MONTH:
      return dayjsDate.format("MMM"); // "Jan"

    case DateFormat.MONTH:
      return dayjsDate.format("MMMM"); // "January"

    case DateFormat.ORDINAL_DAY:
      return dayjsDate.format("Do"); // "1st", "2nd" (advancedFormat)

    case DateFormat.DAY_MONTH:
      return dayjsDate.format("D MMM"); // "15 Jan"

    case DateFormat.DAY_MONTH_YEAR:
      return dayjsDate.format("D MMM YYYY"); // "15 Jan 2024"

    case DateFormat.MONTH_DAY:
      return dayjsDate.format("MMMM D"); // "January 15"

    case DateFormat.DOT_DATE:
      return dayjsDate.format("DD.MM.YYYY"); // "15.01.2024"

    case DateFormat.NUMERIC_MONTH:
      return dayjsDate.format("M"); // "1".."12"

    case DateFormat.NUMERIC_DAY:
      return dayjsDate.format("D"); // "1".."31"

    case DateFormat.YEAR:
      return dayjsDate.format("YYYY"); // "2024"

    case DateFormat.SHORT_DATETIME_SECONDS:
      return dayjsDate.format("MM/DD/YYYY h:mm:ss A"); // "01/15/2024 2:30:45 PM"

    case DateFormat.TIME_24H_SECONDS:
      return dayjsDate.format("HH:mm:ss"); // "14:30:45"

    default:
      throw new Error(`Unsupported date format: ${format}`);
  }
}
