import type { Posting } from '@/api/types'

import { accountBalance, accountKind, accountName, hasParent, isArchived } from './account'
import {
  captureKind,
  captureStatus,
  captureStatusTone,
  captureTime,
  isResolved,
  needsAttention,
} from './capture'
import { entryNote, entryPostings, entryTitle, hasNote, isReversed } from './entry'
import { absent } from './index'

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
  capture: Parameters<typeof captureKind>[0]
  kind: string
  time: string
  status: string
}[] = [
  {
    name: 'a capture with every field',
    capture: { kind: 'text', received_at: '2026-02-14T09:31:12Z', status: 'captured' },
    kind: 'text',
    time: '2026-02-14 09:31',
    status: 'captured',
  },
  {
    name: 'a capture in a non-UTC offset',
    capture: { kind: 'email', received_at: '2026-02-14T09:31:12+02:00', status: 'pending' },
    kind: 'email',
    time: '2026-02-14 09:31',
    status: 'pending',
  },
  {
    name: 'a capture with no kind and no time',
    capture: { status: 'extracting' },
    kind: absent,
    time: absent,
    status: 'extracting',
  },
  { name: 'an empty row', capture: {}, kind: absent, time: absent, status: absent },
]

describe('format/capture', () => {
  it.each(captureCases)(
    '$name renders kind, time and status',
    ({ capture, kind, time, status }) => {
      expect(captureKind(capture)).toBe(kind)
      expect(captureTime(capture)).toBe(time)
      expect(captureStatus(capture)).toBe(status)
    },
  )

  const tones: { status: string | undefined; tone: string }[] = [
    { status: 'captured', tone: 'text-success' },
    { status: 'approved', tone: 'text-success' },
    { status: 'pending', tone: 'text-warning' },
    { status: 'extracting', tone: 'text-warning' },
    { status: 'duplicate', tone: 'text-info' },
    { status: 'rejected', tone: 'text-danger' },
    { status: 'failed', tone: 'text-danger' },
    { status: 'unknown', tone: 'text-text-muted' },
    { status: undefined, tone: 'text-text-muted' },
  ]

  it.each(tones)('a $status status is $tone', ({ status, tone }) => {
    expect(captureStatusTone({ status })).toBe(tone)
  })

  const flags: {
    name: string
    capture: Parameters<typeof isResolved>[0]
    resolved: boolean
    attention: boolean
  }[] = [
    {
      name: 'a resolved capture',
      capture: { status: 'captured', resolved_at: '2026-02-14T09:40:00Z' },
      resolved: true,
      attention: false,
    },
    { name: 'a pending capture', capture: { status: 'pending' }, resolved: false, attention: true },
    {
      name: 'an extracting capture',
      capture: { status: 'extracting' },
      resolved: false,
      attention: true,
    },
    {
      name: 'a terminal capture with no stamp',
      capture: { status: 'approved' },
      resolved: false,
      attention: false,
    },
  ]

  it.each(flags)(
    '$name is resolved=$resolved attention=$attention',
    ({ capture, resolved, attention }) => {
      expect(isResolved(capture)).toBe(resolved)
      expect(needsAttention(capture)).toBe(attention)
    },
  )
})

const entryCases: {
  name: string
  entry: Parameters<typeof entryTitle>[0]
  title: string
  note: string
  hasNote: boolean
  reversed: boolean
  postings: number
}[] = [
  {
    name: 'an entry with a payee and a note',
    entry: {
      note: 'a flat white',
      payee: { name: 'Coffee', ref: 'r'.repeat(32) },
      postings: [posting('a'.repeat(32), '-350'), posting('b'.repeat(32), '350')],
    },
    title: 'Coffee · a flat white',
    note: 'a flat white',
    hasNote: true,
    reversed: false,
    postings: 2,
  },
  {
    name: 'an entry with a payee only',
    entry: { payee: { name: 'Coffee', ref: 'r'.repeat(32) } },
    title: 'Coffee',
    note: absent,
    hasNote: false,
    reversed: false,
    postings: 0,
  },
  {
    name: 'an entry with a note only',
    entry: { note: 'a flat white' },
    title: 'a flat white',
    note: 'a flat white',
    hasNote: true,
    reversed: false,
    postings: 0,
  },
  {
    name: 'a reversed entry',
    entry: { reversed_at: '2026-02-15T08:00:00Z' },
    title: absent,
    note: absent,
    hasNote: false,
    reversed: true,
    postings: 0,
  },
  {
    name: 'an empty row',
    entry: {},
    title: absent,
    note: absent,
    hasNote: false,
    reversed: false,
    postings: 0,
  },
]

describe('format/entry', () => {
  it.each(entryCases)('$name formats its title, note and flags', (tc) => {
    expect(entryTitle(tc.entry)).toBe(tc.title)
    expect(entryNote(tc.entry)).toBe(tc.note)
    expect(hasNote(tc.entry)).toBe(tc.hasNote)
    expect(isReversed(tc.entry)).toBe(tc.reversed)
    expect(entryPostings(tc.entry)).toHaveLength(tc.postings)
  })
})

const accountCases: {
  name: string
  account: Parameters<typeof accountName>[0]
  label: string
  kind: string
  archived: boolean
  parent: boolean
  balance: string
}[] = [
  {
    name: 'a child asset account in euros',
    account: {
      base_amount_minor: '123456',
      currency: 'EUR',
      kind: 'asset',
      name: 'Cash',
      parent_ref: 'p'.repeat(32),
    },
    label: 'Cash',
    kind: 'Asset',
    archived: false,
    parent: true,
    balance: '1,234.56 EUR',
  },
  {
    name: 'an archived liability account',
    account: { archived: true, kind: 'liability', name: 'Card' },
    label: 'Card',
    kind: 'Liability',
    archived: true,
    parent: false,
    balance: '0.00',
  },
  {
    name: 'an account with a negative balance',
    account: { base_amount_minor: '-350', currency: 'EUR' },
    label: absent,
    kind: absent,
    archived: false,
    parent: false,
    balance: '-3.50 EUR',
  },
  {
    name: 'a kind the schema has not added yet',
    account: { kind: 'crypto' },
    label: absent,
    kind: absent,
    archived: false,
    parent: false,
    balance: '0.00',
  },
  {
    name: 'an empty row',
    account: {},
    label: absent,
    kind: absent,
    archived: false,
    parent: false,
    balance: '0.00',
  },
]

describe('format/account', () => {
  it.each(accountCases)('$name formats its name, kind, flags and balance', (tc) => {
    expect(accountName(tc.account)).toBe(tc.label)
    expect(accountKind(tc.account)).toBe(tc.kind)
    expect(isArchived(tc.account)).toBe(tc.archived)
    expect(hasParent(tc.account)).toBe(tc.parent)
    expect(accountBalance(tc.account)).toBe(tc.balance)
  })

  it('takes the minor units a screen knows', () => {
    const yen = { base_amount_minor: '1200', currency: 'JPY' }

    expect(accountBalance(yen, 0)).toBe('1,200 JPY')
  })
})
