import { useQuery } from '@tanstack/react-query'

import { listAudit } from '@/api/audit'

/** One row's own history, by ref: precise, any age, one request. */
export function useEntityAudit(kind: string, ref: string) {
  return useQuery({
    queryKey: ['audit', kind, ref],
    queryFn: () => listAudit({ entity_kind: kind, entity_ref: ref, limit: 50 }),
  })
}

/**
 * The reversal scan. A reversal is written against the mirror entry it created and only names its
 * parent in `to.reversal_of_ref`, so a page of ledger rows is what lets an entry see the reversal
 * that happened to it; `useEntityAudit` cannot, because the row is not keyed to the parent.
 */
export function useLedgerAudit() {
  return useQuery({
    queryKey: ['audit', 'ledger_entry', 'scan'],
    queryFn: () => listAudit({ entity_kind: 'ledger_entry', limit: 200 }),
  })
}
