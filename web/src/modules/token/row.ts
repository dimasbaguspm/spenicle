import type { Token } from '@/api/types'
import { DateFormat, formatDate } from '@/lib/date'
import { absent } from '@/lib/text'

/** One token as a row renders it: its name, preview, scopes and whether it is still live. */
export type TokenRow = {
  ref: string
  name: string
  preview: string
  scopes: string
  isRevoked: boolean
  expires: string
  lastUsed: string
}

export function tokenRow(token: Token): TokenRow {
  return {
    ref: token.ref,
    name: token.name === '' ? absent : token.name,
    preview: token.preview === '' ? absent : token.preview,
    scopes: (token.scopes ?? []).join(', '),
    isRevoked: token.revoked_at !== undefined,
    expires: formatDate(token.expires_at, DateFormat.Day),
    lastUsed: formatDate(token.last_used_at, DateFormat.Day),
  }
}
