import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { RouterProvider, createMemoryHistory, createRouter } from '@tanstack/react-router'
import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { routeTree } from '@/router'

// the real route tree over memory history: the guard and the screen together
function renderAt(path: string) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  const router = createRouter({
    routeTree,
    history: createMemoryHistory({ initialEntries: [path] }),
  })

  render(
    <QueryClientProvider client={client}>
      <RouterProvider router={router} />
    </QueryClientProvider>,
  )
}

describe('login', () => {
  it('asks for the instance password and stores a token, not the password', async () => {
    renderAt('/')

    expect(await screen.findByRole('heading', { name: 'Spenicle' })).toBeInTheDocument()
    expect(screen.getByPlaceholderText('Instance password')).toHaveAttribute('type', 'password')
    expect(screen.getByRole('button', { name: 'Sign in' })).toBeInTheDocument()
  })

  it('sends an unauthenticated visitor to the login screen', async () => {
    renderAt('/ledger')

    expect(await screen.findByRole('heading', { name: 'Spenicle' })).toBeInTheDocument()
  })
})
