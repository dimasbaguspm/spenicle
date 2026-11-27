import { useQuery } from '@tanstack/react-query'
import { useMemo } from 'react'

import { api, errorMessage } from '@/api/client'
import { Text } from '@/components/primitives/text'
import { CaptureList } from '@/components/widgets/capture-list'

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
  const rows = useMemo(() => captures.data?.captures ?? [], [captures.data])

  return (
    <section className="space-y-1">
      <Text as="h2" tone="section">
        Capture inbox
      </Text>
      <Text as="p" tone="muted" className="pb-3">
        Approving a capture is the next screen; the queue itself is read-only here.
      </Text>
      {captures.isPending ? (
        <Text as="p" tone="muted">
          Loading…
        </Text>
      ) : null}
      {captures.error !== null ? (
        <Text as="p" tone="muted" className="text-danger" role="alert">
          {captures.error.message}
        </Text>
      ) : null}
      <CaptureList rows={rows} />
    </section>
  )
}
