import type { Token } from '@/api/types'
import { Button } from '@/components/primitives/button'
import { Text } from '@/components/primitives/text'

import { tokenRow } from './row'

/**
 * Every credential this instance has handed out. Revoking is the caller's mutation, so the list
 * stays a pure rendering of rows and the screen keeps the one place a request is made.
 */
export function TokenList({
  tokens,
  onRevoke,
  revoking,
}: {
  tokens: readonly Token[]
  onRevoke: (ref: string) => void
  revoking: boolean
}) {
  return (
    <ul>
      {tokens.map((token) => {
        const row = tokenRow(token)

        return (
          <li
            key={row.ref}
            className="border-ink-800/70 flex flex-wrap items-baseline gap-3 border-t py-3 text-sm first:border-t-0"
          >
            <span className="text-porcelain-100 min-w-0 flex-1 truncate">{row.name}</span>
            <Text as="span" tone="code" className="text-ink-400">
              {row.preview}
            </Text>
            <Text as="span" tone="caption" className="text-ink-500">
              {row.scopes}
            </Text>
            {row.isRevoked ? (
              <Text as="span" tone="caption" className="text-ink-500">
                revoked
              </Text>
            ) : (
              <Button
                tone="danger"
                size="sm"
                loading={revoking}
                onClick={() => {
                  onRevoke(row.ref)
                }}
              >
                Revoke
              </Button>
            )}
          </li>
        )
      })}
    </ul>
  )
}
