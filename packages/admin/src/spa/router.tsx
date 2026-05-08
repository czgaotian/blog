import { createBrowserRouter } from 'react-router'
import { AdminLayout } from './layouts/admin-layout'
import { SpaTestPage } from './pages/spa-test'
import { NotFoundPage } from './pages/not-found'

export const router = createBrowserRouter(
  [
    {
      path: '/admin',
      element: <AdminLayout />,
      children: [
        { path: 'spa-test', element: <SpaTestPage /> },
        { path: '*', element: <NotFoundPage /> },
      ],
    },
  ],
  {
    basename: '/',
  },
)
