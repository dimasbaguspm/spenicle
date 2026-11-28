import type { Posting } from '@/api/types'

import { formatAccountData, type FormattedAccount } from './account'
import { formatCaptureData, type FormattedCapture } from './capture'
import { formatDay, formatEntryData, type FormattedEntry } from './entry'

const absent = '—'

const posting = (accountRef: string, amountMinor: string): Posting => ({
  account: { kind: 'asset', name: 'Cash', ref: accountRef },
  account_ref: accountRef,
  amount_minor: amountMinor,
  base_amount_minor: amountMinor,
  fx_rate: '1',
  fx_source: 'identity',
})

const captureCases: {
  name: string
  input: Parameters<typeof formatCaptureData>[0]
  want: FormattedCapture
}[] = [
  {
    name: 'a capture with every field',
    input: { kind: 'text', received_at: '2026-02-14T09:31:12Z', status: 'captured' },
    want: {
      time: '2026-02-14 09:31',
      kind: 'text',
      status: 'captured',
      statusTone: 'text-success',
      isResolved: false,
      needsAttention: false,
    },
  },
  {
    name: 'a capture in a non-UTC offset',
    input: { kind: 'email', received_at: '2026-02-14T09:31:12+02:00', status: 'approved' },
    want: {
      time: '2026-02-14 09:31',
      kind: 'email',
      status: 'approved',
      statusTone: 'text-success',
      isResolved: false,
      needsAttention: false,
    },
  },
  {
    name: 'a pending capture with no kind and no time',
    input: { status: 'pending' },
    want: {
      time: absent,
      kind: absent,
      status: 'pending',
      statusTone: 'text-warning',
      isResolved: false,
      needsAttention: true,
    },
  },
  {
    name: 'an extracting capture',
    input: { status: 'extracting' },
    want: {
      time: absent,
      kind: absent,
      status: 'extracting',
      statusTone: 'text-warning',
      isResolved: false,
      needsAttention: true,
    },
  },
  {
    name: 'a duplicate capture',
    input: { status: 'duplicate' },
    want: {
      time: absent,
      kind: absent,
      status: 'duplicate',
      statusTone: 'text-info',
      isResolved: false,
      needsAttention: false,
    },
  },
  {
    name: 'a rejected capture',
    input: { status: 'rejected' },
    want: {
      time: absent,
      kind: absent,
      status: 'rejected',
      statusTone: 'text-danger',
      isResolved: false,
      needsAttention: false,
    },
  },
  {
    name: 'a failed capture',
    input: { status: 'failed' },
    want: {
      time: absent,
      kind: absent,
      status: 'failed',
      statusTone: 'text-danger',
      isResolved: false,
      needsAttention: false,
    },
  },
  {
    name: 'a status the API has not added yet',
    input: { status: 'unknown' },
    want: {
      time: absent,
      kind: absent,
      status: 'unknown',
      statusTone: 'text-text-muted',
      isResolved: false,
      needsAttention: false,
    },
  },
  {
    name: 'a resolved capture',
    input: { status: 'captured', resolved_at: '2026-02-14T09:40:00Z' },
    want: {
      time: absent,
      kind: absent,
      status: 'captured',
      statusTone: 'text-success',
      isResolved: true,
      needsAttention: false,
    },
  },
  {
    name: 'an empty row',
    input: {},
    want: {
      time: absent,
      kind: absent,
      status: absent,
      statusTone: 'text-text-muted',
      isResolved: false,
      needsAttention: false,
    },
  },
]

describe('format/capture', () => {
  it.each(captureCases)('$name formats its time, kind, status and flags', ({ input, want }) => {
    expect(formatCaptureData(input)).toEqual(want)
  })
})

const entryCases: {
  name: string
  input: Parameters<typeof formatEntryData>[0]
  want: FormattedEntry
}[] = [
  {
    name: 'an entry with a payee and a note',
    input: {
      note: 'a flat white',
      payee: { name: 'Coffee', ref: 'r'.repeat(32) },
      postings: [posting('a'.repeat(32), '-350'), posting('b'.repeat(32), '350')],
    },
    want: {
      title: 'Coffee · a flat white',
      note: 'a flat white',
      isReversed: false,
      postings: [posting('a'.repeat(32), '-350'), posting('b'.repeat(32), '350')],
    },
  },
  {
    name: 'an entry with a payee only',
    input: { payee: { name: 'Coffee', ref: 'r'.repeat(32) } },
    want: { title: 'Coffee', note: absent, isReversed: false, postings: [] },
  },
  {
    name: 'an entry with a note only',
    input: { note: 'a flat white' },
    want: { title: 'a flat white', note: 'a flat white', isReversed: false, postings: [] },
  },
  {
    name: 'an entry with a payee that carries no name',
    input: { note: 'a flat white', payee: { ref: 'r'.repeat(32) } },
    want: { title: 'a flat white', note: 'a flat white', isReversed: false, postings: [] },
  },
  {
    name: 'a reversed entry',
    input: { reversed_at: '2026-02-15T08:00:00Z' },
    want: { title: absent, note: absent, isReversed: true, postings: [] },
  },
  {
    name: 'an empty row',
    input: {},
    want: { title: absent, note: absent, isReversed: false, postings: [] },
  },
]

describe('format/entry', () => {
  it.each(entryCases)('$name formats its title, note and flags', ({ input, want }) => {
    expect(formatEntryData(input)).toEqual(want)
  })
})

const accountCases: {
  name: string
  input: Parameters<typeof formatAccountData>[0]
  units?: number | undefined
  want: FormattedAccount
}[] = [
  {
    name: 'a child asset account in euros',
    input: {
      base_amount_minor: '123456',
      currency: 'EUR',
      kind: 'asset',
      name: 'Cash',
      parent_ref: 'p'.repeat(32),
    },
    want: {
      name: 'Cash',
      kind: 'Asset',
      balance: '1,234.56 EUR',
      isArchived: false,
      hasParent: true,
    },
  },
  {
    name: 'an archived liability account',
    input: { archived: true, kind: 'liability', name: 'Card' },
    want: { name: 'Card', kind: 'Liability', balance: '0.00', isArchived: true, hasParent: false },
  },
  {
    name: 'an account with a negative balance',
    input: { base_amount_minor: '-350', currency: 'EUR' },
    want: { name: absent, kind: absent, balance: '-3.50 EUR', isArchived: false, hasParent: false },
  },
  {
    name: 'a kind the schema has not added yet',
    input: { kind: 'crypto' },
    want: { name: absent, kind: absent, balance: '0.00', isArchived: false, hasParent: false },
  },
  {
    name: 'a zero-decimal currency when the screen passes its units',
    input: { base_amount_minor: '1200', currency: 'JPY' },
    units: 0,
    want: { name: absent, kind: absent, balance: '1,200 JPY', isArchived: false, hasParent: false },
  },
  {
    name: 'an empty row',
    input: {},
    want: { name: absent, kind: absent, balance: '0.00', isArchived: false, hasParent: false },
  },
]

describe('format/account', () => {
  it.each(accountCases)(
    '$name formats its name, kind, flags and balance',
    ({ input, units, want }) => {
      expect(formatAccountData(input, units)).toEqual(want)
    },
  )
})

describe('format/day', () => {
  it.each([
    { name: 'a real day loses the ISO shape', iso: '2026-11-24', want: /24/ },
    { name: 'a malformed day is echoed, never thrown', iso: 'not-a-day', want: /not-a-day/ },
  ])('$name', ({ iso, want }) => {
    expect(formatDay(iso)).toMatch(want)
  })

  it('keeps the ISO string out of the register column', () => {
    expect(formatDay('2026-11-24')).not.toBe('2026-11-24')
  })
})
