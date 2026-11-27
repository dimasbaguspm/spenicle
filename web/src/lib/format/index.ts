/**
 * The formatting layer: each module owns one row's fallbacks, tones and flags, so a component
 * asks a question instead of comparing a raw field. `absent` is the same em dash in all three,
 * and this barrel re-exports one of them so a screen imports the fallback from one place too.
 */
export {
  absent,
  accountBalance,
  accountKind,
  accountName,
  defaultMinorUnits,
  hasParent,
  isArchived,
} from './account'
export {
  captureKind,
  captureStatus,
  captureStatusTone,
  captureTime,
  isResolved,
  needsAttention,
} from './capture'
export { entryNote, entryPostings, entryTitle, hasNote, isReversed } from './entry'
