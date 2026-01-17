/**
 * Price format types enum for type safety
 */
export const PriceFormat = {
  // Currency formats
  /** Example: "Rp1.234,56" (with currency symbol) */
  CURRENCY: "currency",

  /** Example: "Rp1.235" (no decimals) */
  CURRENCY_NO_DECIMALS: "currencyNoDecimals",

  /** Example: "Rp1.234,6" (1 decimal) */
  CURRENCY_ONE_DECIMAL: "currencyOneDecimal",

  /** Example: "Rp1.234,567" (3 decimals) */
  CURRENCY_THREE_DECIMALS: "currencyThreeDecimals",

  // Compact formats
  /** Example: "1.2K", "3.4M", "5.6B" */
  COMPACT: "compact",

  /** Example: "Rp1.2K", "Rp3.4M", "Rp5.6B" */
  COMPACT_CURRENCY: "compactCurrency",

  /** Example: "1.235K", "3.457M" (more precise) */
  COMPACT_PRECISE: "compactPrecise",

  // Accounting format (negative in parentheses)
  /** Example: "Rp1.234,56" or "(Rp1.234,56)" */
  ACCOUNTING: "accounting",

  // Without currency symbol
  /** Example: "1,234.56" */
  DECIMAL: "decimal",

  /** Example: "1,234" */
  INTEGER: "integer",

  /** Example: "1234.56" (no thousand separator) */
  PLAIN_DECIMAL: "plainDecimal",

  // Percentage formats
  /** Example: "12.34%" */
  PERCENTAGE: "percentage",

  /** Example: "12%" (no decimals) */
  PERCENTAGE_INTEGER: "percentageInteger",

  /** Example: "12.3%" (1 decimal) */
  PERCENTAGE_ONE_DECIMAL: "percentageOneDecimal",

  // Special formats
  /** Example: "+Rp1.234,56" or "-Rp1.234,56" */
  SIGNED: "signed",

  /** Example: "1,234.56 IDR" */
  WITH_CODE: "withCode",

  // Crypto formats
  /** Example: "0.00123456 BTC" (8 decimals) */
  CRYPTO_8_DECIMALS: "crypto8Decimals",

  /** Example: "1,234.123456 ETH" (6 decimals) */
  CRYPTO_6_DECIMALS: "crypto6Decimals",

  // Scientific/Technical
  /** Example: "1.23e+6" */
  SCIENTIFIC: "scientific",
} as const;

export type PriceFormatType = (typeof PriceFormat)[keyof typeof PriceFormat];

/**
 * Configuration options for price formatting
 */
interface FormatPriceOptions {
  /** Currency code (ISO 4217) - default: 'IDR' */
  currency?: string;
  /** Locale for formatting (derived from currency if not specified) */
  locale?: string;
}

/**
 * Get locale for a currency code
 */
function getLocaleForCurrency(currency: string): string {
  const localeMap: Record<string, string> = {
    USD: "en-US",
    EUR: "de-DE",
    GBP: "en-GB",
    JPY: "ja-JP",
    INR: "en-IN",
    IDR: "id-ID",
    CNY: "zh-CN",
    KRW: "ko-KR",
    SGD: "en-SG",
    MYR: "ms-MY",
    THB: "th-TH",
    VND: "vi-VN",
    PHP: "en-PH",
  };

  return localeMap[currency] || "id-ID";
}

/**
 * Get currency symbol for compact formats
 */
function getCurrencySymbol(currency: string): string {
  const symbolMap: Record<string, string> = {
    USD: "$",
    EUR: "€",
    GBP: "£",
    JPY: "¥",
    INR: "₹",
    IDR: "Rp",
    CNY: "¥",
    KRW: "₩",
    SGD: "S$",
  };

  return symbolMap[currency] || "";
}

/**
 * Formats a price/number using various currency and numeric formats
 * @param value - The price/number to format (number or string)
 * @param format - The format type to use
 * @param options - Optional configuration (currency defaults to IDR)
 * @returns Formatted price string
 */
export function formatPrice(
  value: number | string,
  format: PriceFormatType,
  options: FormatPriceOptions = {}
): string {
  const currency = options.currency || "IDR";
  const locale = options.locale || getLocaleForCurrency(currency);

  // Convert to number
  const numValue = typeof value === "string" ? parseFloat(value) : value;

  if (isNaN(numValue)) {
    throw new Error("Invalid number provided");
  }

  switch (format) {
    // Currency formats
    case PriceFormat.CURRENCY:
      return new Intl.NumberFormat(locale, {
        style: "currency",
        currency: currency,
      }).format(numValue);

    case PriceFormat.CURRENCY_NO_DECIMALS:
      return new Intl.NumberFormat(locale, {
        style: "currency",
        currency: currency,
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
      }).format(numValue);

    case PriceFormat.CURRENCY_ONE_DECIMAL:
      return new Intl.NumberFormat(locale, {
        style: "currency",
        currency: currency,
        minimumFractionDigits: 1,
        maximumFractionDigits: 1,
      }).format(numValue);

    case PriceFormat.CURRENCY_THREE_DECIMALS:
      return new Intl.NumberFormat(locale, {
        style: "currency",
        currency: currency,
        minimumFractionDigits: 3,
        maximumFractionDigits: 3,
      }).format(numValue);

    // Compact formats
    case PriceFormat.COMPACT:
      return formatCompact(numValue, "");

    case PriceFormat.COMPACT_CURRENCY:
      return formatCompact(numValue, getCurrencySymbol(currency));

    case PriceFormat.COMPACT_PRECISE:
      return formatCompactPrecise(numValue, "");

    // Accounting format
    case PriceFormat.ACCOUNTING:
      return formatAccounting(numValue, getCurrencySymbol(currency), locale);

    // Without currency symbol
    case PriceFormat.DECIMAL:
      return new Intl.NumberFormat(locale, {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      }).format(numValue);

    case PriceFormat.INTEGER:
      return new Intl.NumberFormat(locale, {
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
      }).format(numValue);

    case PriceFormat.PLAIN_DECIMAL:
      return numValue.toFixed(2);

    // Percentage formats
    case PriceFormat.PERCENTAGE:
      return `${numValue.toFixed(2)}%`;

    case PriceFormat.PERCENTAGE_INTEGER:
      return `${Math.round(numValue)}%`;

    case PriceFormat.PERCENTAGE_ONE_DECIMAL:
      return `${numValue.toFixed(1)}%`;

    // Special formats
    case PriceFormat.SIGNED: {
      const formatted = new Intl.NumberFormat(locale, {
        style: "currency",
        currency: currency,
      }).format(Math.abs(numValue));

      if (numValue > 0) return `+${formatted}`;
      if (numValue < 0) return `-${formatted}`;
      return formatted;
    }

    case PriceFormat.WITH_CODE:
      return `${new Intl.NumberFormat(locale, {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      }).format(numValue)} ${currency}`;

    // Crypto formats
    case PriceFormat.CRYPTO_8_DECIMALS:
      return `${numValue.toFixed(8)} ${currency}`;

    case PriceFormat.CRYPTO_6_DECIMALS:
      return `${new Intl.NumberFormat(locale, {
        minimumFractionDigits: 6,
        maximumFractionDigits: 6,
      }).format(numValue)} ${currency}`;

    // Scientific/Technical
    case PriceFormat.SCIENTIFIC:
      return numValue.toExponential(2);

    default:
      throw new Error(`Unsupported price format: ${format}`);
  }
}

/**
 * Helper function to format numbers in compact notation (K, M, B)
 */
function formatCompact(value: number, symbol: string): string {
  const absValue = Math.abs(value);
  const sign = value < 0 ? "-" : "";

  if (absValue >= 1_000_000_000) {
    return `${sign}${symbol}${(absValue / 1_000_000_000).toFixed(1)}B`;
  } else if (absValue >= 1_000_000) {
    return `${sign}${symbol}${(absValue / 1_000_000).toFixed(1)}M`;
  } else if (absValue >= 1_000) {
    return `${sign}${symbol}${(absValue / 1_000).toFixed(1)}K`;
  }
  return `${sign}${symbol}${absValue.toFixed(2)}`;
}

/**
 * Helper function for compact format with more precision
 */
function formatCompactPrecise(value: number, symbol: string): string {
  const absValue = Math.abs(value);
  const sign = value < 0 ? "-" : "";

  if (absValue >= 1_000_000_000) {
    return `${sign}${symbol}${(absValue / 1_000_000_000).toFixed(3)}B`;
  } else if (absValue >= 1_000_000) {
    return `${sign}${symbol}${(absValue / 1_000_000).toFixed(3)}M`;
  } else if (absValue >= 1_000) {
    return `${sign}${symbol}${(absValue / 1_000).toFixed(3)}K`;
  }
  return `${sign}${symbol}${absValue.toFixed(2)}`;
}

/**
 * Helper function for accounting format (negative in parentheses)
 */
function formatAccounting(
  value: number,
  symbol: string,
  locale: string
): string {
  const absValue = Math.abs(value);
  const formatted = new Intl.NumberFormat(locale, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(absValue);

  const symbolPrefix = symbol ? `${symbol}` : "";

  if (value < 0) {
    return `(${symbolPrefix}${formatted})`;
  }
  return `${symbolPrefix}${formatted}`;
}
