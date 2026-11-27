import { QueryClient } from '@tanstack/react-query'

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // the API is on the same host and a ledger is small: one retry is enough
      retry: 1,
      staleTime: 5_000,
      refetchOnWindowFocus: false,
    },
  },
})
