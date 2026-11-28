/**
 * Money is minor units on the wire, always an integer string, never a float. One entry point
 * hands out the chain (`formatMoney(minor, units).toDisplay('USD')`), and every scale — minor,
 * decimal, grouped — is a method on it, so a screen never re-derives one by hand.
 */

/** An exact integer amount in minor units, as the API sends it. */
export type Minor = string

/** The two things a figure needs: the code beside it and how many decimals it carries. */
export type MoneyScale = {
  currency: string
  units: number
}

const scaleOf = (units: number): number =>
  Number.isFinite(units) ? Math.max(0, Math.trunc(units)) : 0

function integerOf(value: Minor | undefined): Minor {
  try {
    return BigInt((value ?? '').trim() || '0').toString()
  } catch {
    return '0'
  }
}

/** parse `"12.34"` into `"1234"` for a currency with 2 minor units. */
function toMinor(input: string, units: number): Minor {
  const trimmed = input.trim().replace(',', '.')
  const negative = trimmed.startsWith('-')
  const [whole = '0', fraction = ''] = (negative ? trimmed.slice(1) : trimmed).split('.')
  const digits = `${whole}${fraction.padEnd(units, '0').slice(0, units)}`.replace(/^0+(?=\d)/, '')

  return `${negative ? '-' : ''}${digits === '' ? '0' : digits}`
}

/** render `"-1234"` as `"12.34"` for a currency with 2 minor units. */
function fromMinor(minor: Minor, units: number): string {
  if (units === 0) {
    return minor
  }

  const negative = minor.startsWith('-')
  const digits = (negative ? minor.slice(1) : minor).padStart(units + 1, '0')

  return `${negative ? '-' : ''}${digits.slice(0, -units)}.${digits.slice(-units)}`
}

/** The exact total of many amounts, without ever leaving the integers. */
export function sumMinor(values: readonly Minor[]): Minor {
  let total = 0n
  for (const value of values) {
    total += BigInt(integerOf(value))
  }

  return total.toString()
}

/** An amount that knows its scale: every spelling of it is one call away. */
export class MoneyAmount {
  readonly #minor: Minor
  readonly #units: number

  constructor(minor: Minor, units: number) {
    this.#minor = integerOf(minor)
    this.#units = scaleOf(units)
  }

  /** the value back on the wire */
  toMinor(): Minor {
    return this.#minor
  }

  /** `1234` at two units reads `12.34` */
  toDecimal(): string {
    return fromMinor(this.#minor, this.#units)
  }

  /** the display form: grouped whole part, exact fraction, and the code only when asked */
  toDisplay(currency?: string): string {
    const plain = this.toDecimal()
    const negative = plain.startsWith('-')
    const [whole = '0', fraction] = (negative ? plain.slice(1) : plain).split('.')
    const grouped = whole.replace(/\B(?=(\d{3})+(?!\d))/g, ',')
    const figure = `${negative ? '-' : ''}${grouped}${fraction === undefined ? '' : `.${fraction}`}`

    // a register column carries the code once, in its heading: repeating it on every row
    // is noise, and noise is what makes a ledger look like a spreadsheet
    return currency === undefined ? figure : `${figure} ${currency}`
  }

  sign(): -1 | 0 | 1 {
    const value = BigInt(this.#minor)

    if (value === 0n) {
      return 0
    }

    return value < 0n ? -1 : 1
  }

  isNegative(): boolean {
    return this.sign() === -1
  }

  absolute(): MoneyAmount {
    const value = BigInt(this.#minor)

    return new MoneyAmount((value < 0n ? -value : value).toString(), this.#units)
  }

  negate(): MoneyAmount {
    return new MoneyAmount((-BigInt(this.#minor)).toString(), this.#units)
  }

  add(other: MoneyAmount | Minor): MoneyAmount {
    const value = other instanceof MoneyAmount ? BigInt(other.toMinor()) : BigInt(integerOf(other))

    return new MoneyAmount((BigInt(this.#minor) + value).toString(), this.#units)
  }
}

/** The one way in from the wire: minor units plus the currency's scale. */
export function formatMoney(minor: Minor, units: number): MoneyAmount {
  return new MoneyAmount(minor, units)
}

/** The one way in from a person: what they typed, read at the currency's scale. */
export function parseMoney(input: string, units: number): MoneyAmount {
  return new MoneyAmount(toMinor(input, scaleOf(units)), units)
}
