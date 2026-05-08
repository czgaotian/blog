import { createBrowserRouter } from 'react-router'
import { AdminLayout } from './layouts/admin-layout'
import { AuthLayout } from './layouts/auth-layout'
import { LoginPage } from './pages/auth/login'
import { RegisterPage } from './pages/auth/register'
import { AcceptInvitationPage } from './pages/auth/accept-invitation'
import { ResetPasswordPage } from './pages/auth/reset-password'
import { DashboardPage } from './pages/dashboard'
import { LogsListPage } from './pages/logs-list'
import { LogDetailsPage } from './pages/log-details'
import { LogConfigPage } from './pages/log-config'
import { ApiReferencePage } from './pages/api-reference'
import { PluginsListPage } from './pages/plugins-list'
import { PluginSettingsPage } from './pages/plugin-settings'
import { SettingsPage } from './pages/settings'
import { UsersListPage } from './pages/users-list'
import { UserEditPage } from './pages/user-edit'
import { SpaTestPage } from './pages/spa-test'
import { NotFoundPage } from './pages/not-found'
import { ContentListPage } from './pages/content-list'
import { FormsListPage } from './pages/forms-list'
import { MediaLibraryPage } from './pages/media-library'
import { CollectionsListPage } from './pages/collections-list'
import { CollectionEditPage } from './pages/collection-edit'
import { ProfilePage } from './pages/profile'
import { ActivityLogsPage } from './pages/activity-logs'

export const router = createBrowserRouter(
  [
    {
      path: '/auth',
      element: <AuthLayout />,
      children: [
        { path: 'login', element: <LoginPage /> },
        { path: 'register', element: <RegisterPage /> },
        { path: 'accept-invitation', element: <AcceptInvitationPage /> },
        { path: 'reset-password', element: <ResetPasswordPage /> },
      ],
    },
    {
      path: '/admin',
      element: <AdminLayout />,
      children: [
        { path: 'dashboard', element: <DashboardPage /> },
        { path: 'logs', element: <LogsListPage /> },
        { path: 'logs/config', element: <LogConfigPage /> },
        { path: 'logs/:id', element: <LogDetailsPage /> },
        { path: 'api-reference', element: <ApiReferencePage /> },
        { path: 'plugins', element: <PluginsListPage /> },
        { path: 'plugins/:id/settings', element: <PluginSettingsPage /> },
        { path: 'settings', element: <SettingsPage /> },
        { path: 'users', element: <UsersListPage /> },
        { path: 'users/:id/edit', element: <UserEditPage /> },
        { path: 'content', element: <ContentListPage /> },
        { path: 'forms', element: <FormsListPage /> },
        { path: 'media', element: <MediaLibraryPage /> },
        { path: 'collections', element: <CollectionsListPage /> },
        { path: 'collections/new', element: <CollectionEditPage /> },
        { path: 'collections/:id/edit', element: <CollectionEditPage /> },
        { path: 'profile', element: <ProfilePage /> },
        { path: 'activity-logs', element: <ActivityLogsPage /> },
        { path: 'spa-test', element: <SpaTestPage /> },
        { path: '*', element: <NotFoundPage /> },
      ],
    },
  ],
  {
    basename: '/',
  },
)
