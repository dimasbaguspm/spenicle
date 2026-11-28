import { useQuery } from '@tanstack/react-query'

import { listAudit } from '@/api/audit'

/**
 * The journal rows a screen needs to tell one entry's story. A reversal is written against the
 * mirror entry it created and names its parent in `to.reversal_of_ref`, so a single page of ledger
 * rows is what lets the timeline show both "this was reversed" and "this is a reversal of".
 */
export function useLedgerAudit() {
  return useQuery({
    queryKey: ['audit', 'ledger_entry'],
    queryFn: () => listAudit({ entity_kind: 'ledger_entry', limit: 200 }),
  })
}
