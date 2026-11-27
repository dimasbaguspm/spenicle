import { useQuery } from '@tanstack/react-query'

import { api, errorMessage } from '@/api/client'

const tones: Record<string, string> = {
  captured: 'text-success',
  approved: 'text-success',
  pending: 'text-warning',
  extracting: 'text-warning',
  duplicate: 'text-info',
  rejected: 'text-danger',
  failed: 'text-danger',
}

function statusTone(status: string | undefined): string {
  return tones[status ?? ''] ?? 'text-text-muted'
}

async function fetchCaptures() {
  const { data, error, response } = await api.GET('/api/captures', {
    params: { query: { limit: 20 } },
  })
  if (error !== undefined) {
    throw new Error(errorMessage(error, response.status))
  }

  return data
}

export function CapturesPage() {
  const captures = useQuery({ queryKey: ['captures'], queryFn: fetchCaptures })

  return (
    <section className="space-y-1">
      <h2 className="text-xs font-medium uppercase tracking-[0.14em] text-brass-500">
        Capture inbox
      </h2>
      <p className="pb-3 text-sm text-text-muted">
        Approving a capture is the next screen; the queue itself is read-only here.
      </p>
      {captures.isPending ? <p className="text-text-muted">Loading…</p> : null}
      {captures.error !== null ? (
        <p role="alert" className="text-sm text-danger">
          {captures.error.message}
        </p>
      ) : null}
      <ul className="divide-y divide-ink-800">
        {(captures.data?.captures ?? []).map((capture) => (
          <li key={capture.ref} className="flex items-baseline gap-3 py-2.5 text-sm">
            <span className="w-32 shrink-0 tabular-nums text-text-muted">
              {(capture.received_at ?? '').slice(0, 16).replace('T', ' ')}
            </span>
            <span className="flex-1 truncate">{capture.kind ?? '—'}</span>
            <span className={statusTone(capture.status)}>{capture.status}</span>
          </li>
        ))}
      </ul>
    </section>
  )
}
