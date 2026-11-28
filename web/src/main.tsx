import { QueryClientProvider } from '@tanstack/react-query'
import { RouterProvider } from '@tanstack/react-router'
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'

import { queryClient } from '@/api/query'
import { AppProvider, AuthProvider } from '@/providers'
import { router } from '@/router'

import './styles.css'

const container = document.getElementById('root')
if (container === null) {
  throw new Error('index.html is missing #root')
}

createRoot(container).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      {/* bootstrap is the gate: nothing below it renders before the instance answered */}
      <AppProvider>
        <AuthProvider>
          <RouterProvider router={router} />
        </AuthProvider>
      </AppProvider>
    </QueryClientProvider>
  </StrictMode>,
)
