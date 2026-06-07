import { RouterProvider } from 'react-router'
import { ErrorBoundary } from './components/error-boundary'
import { Toaster } from './components/ui/sonner'
import { router } from './router'

export function App() {
  return (
    <ErrorBoundary>
      <RouterProvider router={router} />
      <Toaster richColors position="top-right" />
    </ErrorBoundary>
  )
}
