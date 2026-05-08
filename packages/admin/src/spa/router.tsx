import { createBrowserRouter } from 'react-router'
import { AdminLayout } from './layouts/admin-layout'
import { DashboardPage } from './pages/dashboard'
import { LogsListPage } from './pages/logs-list'
import { SpaTestPage } from './pages/spa-test'
import { NotFoundPage } from './pages/not-found'

export const router = createBrowserRouter(
  [
    {
      path: '/admin',
      element: <AdminLayout />,
      children: [
        { path: 'dashboard', element: <DashboardPage /> },
        { path: 'logs', element: <LogsListPage /> },
        { path: 'spa-test', element: <SpaTestPage /> },
        { path: '*', element: <NotFoundPage /> },
      ],
    },
  ],
  {
    basename: '/',
  },
)
