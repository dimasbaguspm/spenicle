import { useQuery } from '@tanstack/react-query'

/**
 * The build a self-hoster is actually running. `/healthz` is public and answers `version`
 * (`<tag>+<sha7>`, or `dev` from a local build), so the footer can prove it without a credential.
 */
export function useVersion() {
  return useQuery({
    queryKey: ['healthz', 'version'],
    queryFn: async (): Promise<string> => {
      const response = await fetch('/healthz')

      if (!response.ok) {
        return ''
      }

      const body: unknown = await response.json().catch(() => null)
      const version = (body as { version?: unknown } | null)?.version

      return typeof version === 'string' ? version : ''
    },
    staleTime: Number.POSITIVE_INFINITY,
    retry: false,
  })
}
