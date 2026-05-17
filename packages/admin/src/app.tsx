import { RouterProvider } from 'react-router'
import { ErrorBoundary } from './components/error-boundary'
import { router } from './router'

export function App() {
  return (
    <ErrorBoundary>
      <RouterProvider router={router} />
    </ErrorBoundary>
  )
}
