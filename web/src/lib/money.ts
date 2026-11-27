/**
 * Money is minor units on the wire, always a string, never a float. These helpers
 * keep that promise in the browser too: no Number(), no toFixed() on an amount.
 */

/** parse "12.34" into "1234" for a currency with 2 minor units. */
export function toMinor(input: string, units: number): string {
  const trimmed = input.trim().replace(',', '.')
  const negative = trimmed.startsWith('-')
  const [whole = '0', fraction = ''] = (negative ? trimmed.slice(1) : trimmed).split('.')

  const digits = `${whole}${fraction.padEnd(units, '0').slice(0, units)}`.replace(/^0+(?=\d)/, '')

  return `${negative ? '-' : ''}${digits === '' ? '0' : digits}`
}

/** render "-1234" as "12.34" for a currency with 2 minor units. */
export function fromMinor(minor: string, units: number): string {
  if (units === 0) {
    return minor
  }

  const negative = minor.startsWith('-')
  const digits = (negative ? minor.slice(1) : minor).padStart(units + 1, '0')

  return `${negative ? '-' : ''}${digits.slice(0, -units)}.${digits.slice(-units)}`
}

/** the display form: grouped whole part, exact fraction, the code beside it. */
export function formatMoney(minor: string, units: number, currency: string): string {
  const plain = fromMinor(minor, units)
  const negative = plain.startsWith('-')
  const [whole = '0', fraction] = (negative ? plain.slice(1) : plain).split('.')
  const grouped = whole.replace(/\B(?=(\d{3})+(?!\d))/g, ',')

  return `${negative ? '-' : ''}${grouped}${fraction === undefined ? '' : `.${fraction}`} ${currency}`
}
