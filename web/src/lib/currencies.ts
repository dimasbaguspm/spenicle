/**
 * The codes a claim can pick from. `GET /api/meta` knows the full list, but it sits behind a
 * credential and the claim screen holds none yet, so this is the short list a household needs.
 */
export const claimCurrencies = [
  { label: 'IDR — Indonesian rupiah', value: 'IDR' },
  { label: 'USD — US dollar', value: 'USD' },
  { label: 'EUR — Euro', value: 'EUR' },
  { label: 'GBP — Pound sterling', value: 'GBP' },
  { label: 'SGD — Singapore dollar', value: 'SGD' },
  { label: 'MYR — Malaysian ringgit', value: 'MYR' },
  { label: 'THB — Thai baht', value: 'THB' },
  { label: 'VND — Vietnamese dong', value: 'VND' },
  { label: 'PHP — Philippine peso', value: 'PHP' },
  { label: 'INR — Indian rupee', value: 'INR' },
  { label: 'JPY — Japanese yen', value: 'JPY' },
  { label: 'CNY — Chinese yuan', value: 'CNY' },
  { label: 'HKD — Hong Kong dollar', value: 'HKD' },
  { label: 'KRW — South Korean won', value: 'KRW' },
  { label: 'AUD — Australian dollar', value: 'AUD' },
  { label: 'NZD — New Zealand dollar', value: 'NZD' },
  { label: 'CAD — Canadian dollar', value: 'CAD' },
  { label: 'CHF — Swiss franc', value: 'CHF' },
  { label: 'SEK — Swedish krona', value: 'SEK' },
  { label: 'NOK — Norwegian krone', value: 'NOK' },
  { label: 'DKK — Danish krone', value: 'DKK' },
  { label: 'PLN — Polish złoty', value: 'PLN' },
  { label: 'TRY — Turkish lira', value: 'TRY' },
  { label: 'BRL — Brazilian real', value: 'BRL' },
  { label: 'MXN — Mexican peso', value: 'MXN' },
  { label: 'ZAR — South African rand', value: 'ZAR' },
  { label: 'AED — UAE dirham', value: 'AED' },
] as const
