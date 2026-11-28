import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { RouterProvider, createMemoryHistory, createRouter } from '@tanstack/react-router'
import { render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { routeTree } from '@/router'

// the screen never touches the network directly: the two reads it makes are the seam
const state = vi.hoisted(() => ({ setupCompleted: false, metaFailure: 0 }))

const metaBody = {
  settings: {
    base_currency: 'IDR',
    timezone: 'UTC',
    extraction_enabled: false,
    ai_assistance: false,
  },
  accounts: [],
  payees: [],
  recurring: [],
  currencies: [{ code: 'IDR', minor_units: 2, symbol: 'Rp' }],
}

vi.mock('@/api/bootstrap', () => ({
  fetchBootstrap: async () => ({
    setup_completed: state.setupCompleted,
    base_currency: 'IDR',
    timezone: 'UTC',
    extraction_enabled: false,
    ai_assistance: false,
  }),
}))

vi.mock('@/api/meta', async () => {
  const { apiError } = await import('@/api/error')

  return {
    fetchMeta: async () => {
      if (state.metaFailure !== 0) {
        throw apiError(state.metaFailure, {
          error: { code: 'internal_error', message: 'internal error' },
        })
      }

      return metaBody
    },
  }
})

function renderSetup() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  const router = createRouter({
    routeTree,
    history: createMemoryHistory({ initialEntries: ['/setup'] }),
  })

  render(
    <QueryClientProvider client={client}>
      <RouterProvider router={router} />
    </QueryClientProvider>,
  )
}

beforeEach(() => {
  state.setupCompleted = false
  state.metaFailure = 0
})

describe('setup', () => {
  it('offers the claim form on an unclaimed instance', async () => {
    renderSetup()

    expect(await screen.findByRole('heading', { name: 'Claim this instance' })).toBeInTheDocument()
  })

  it('refuses to claim a completed instance', async () => {
    state.setupCompleted = true
    renderSetup()

    expect(await screen.findByRole('heading', { name: 'Already claimed' })).toBeInTheDocument()
  })

  it('treats a password without a completed setup as claimed, through the 401', async () => {
    state.metaFailure = 401
    renderSetup()

    expect(await screen.findByRole('heading', { name: 'Already claimed' })).toBeInTheDocument()
  })

  it('keeps the form and shows the failure when the API is broken, not claimed', async () => {
    state.metaFailure = 500
    renderSetup()

    expect(await screen.findByRole('heading', { name: 'Claim this instance' })).toBeInTheDocument()
    expect(await screen.findByRole('alert')).toHaveTextContent('internal error')
  })
})
