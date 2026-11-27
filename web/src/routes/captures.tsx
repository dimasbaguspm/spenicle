import { useQuery } from '@tanstack/react-query'

import { api, errorMessage } from '@/api/client'

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
      <h2 className="text-sm font-medium text-neutral-400">Capture inbox</h2>
      <p className="pb-3 text-sm text-neutral-500">
        Approving a capture is the next screen; the queue itself is read-only here.
      </p>
      {captures.isPending ? <p className="text-neutral-500">Loading…</p> : null}
      {captures.error !== null ? (
        <p role="alert" className="text-sm text-red-400">
          {captures.error.message}
        </p>
      ) : null}
      <ul className="divide-y divide-neutral-900">
        {(captures.data?.captures ?? []).map((capture) => (
          <li key={capture.ref} className="flex items-baseline gap-3 py-2 text-sm">
            <span className="tabular-nums text-neutral-500">
              {(capture.received_at ?? '').slice(0, 16).replace('T', ' ')}
            </span>
            <span className="flex-1 truncate">{capture.kind ?? '—'}</span>
            <span className="text-neutral-400">{capture.status}</span>
          </li>
        ))}
      </ul>
    </section>
  )
}
