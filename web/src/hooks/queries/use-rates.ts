import { useQuery } from '@tanstack/react-query'

import { getRate } from '@/api/rates'

const code = /^[A-Z]{3}$/

/** A lookup only runs once both sides are a currency: an empty picker is not a request. */
export function useRate(base: string, quote: string, on: string) {
  return useQuery({
    queryKey: ['rates', base, quote, on],
    queryFn: () => getRate({ base, quote, ...(on === '' ? {} : { on }) }),
    enabled: code.test(base) && code.test(quote),
  })
}
