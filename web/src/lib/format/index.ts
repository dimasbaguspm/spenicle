/**
 * The formatting layer: each module owns one row's fallbacks, tones and flags, behind a single
 * function that answers every question a component asks of a row — never a raw field compare.
 */
export { formatAccountData, type FormattedAccount } from './account'
export { formatCaptureData, type FormattedCapture } from './capture'
export { formatEntryData, type FormattedEntry } from './entry'
