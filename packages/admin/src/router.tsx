import { createBrowserRouter, Navigate } from "react-router";
import { BaseLayout } from "./layouts/base-layout";
import { AuthLayout } from "./layouts/auth-layout";
import { LoginPage } from "./pages/auth/login";
import { RegisterPage } from "./pages/auth/register";
import { DashboardPage } from "./pages/dashboard";
import { LogsListPage } from "./pages/logs-list";
import { LogDetailsPage } from "./pages/log-details";
import { LogConfigPage } from "./pages/log-config";
import { SettingsPage } from "./pages/settings";
import { SpaTestPage } from "./pages/spa-test";
import { NotFoundPage } from "./pages/not-found";
import { ContentsListPage } from "./pages/contents-list";
import { ContentCreatePage } from "./pages/content-create";
import { ContentEditPage } from "./pages/content-edit";
import { CategoriesListPage } from "./pages/categories-list";
import { MediaLibraryPage } from "./pages/media-library";
import { TagsListPage } from "./pages/tags-list";
import { ProfilePage } from "./pages/profile";
import { SecurityAuditPage } from "./pages/security-audit";
import { AnalyticsPage } from "./pages/analytics";

export const router = createBrowserRouter(
  [
    {
      path: "/auth",
      element: <AuthLayout />,
      children: [
        { path: "login", element: <LoginPage /> },
        { path: "register", element: <RegisterPage /> },
      ],
    },
    {
      path: "/",
      element: <BaseLayout />,
      children: [
        { index: true, element: <Navigate to="/dashboard" replace /> },
        { path: "dashboard", element: <DashboardPage /> },
        { path: "logs", element: <LogsListPage /> },
        { path: "logs/config", element: <LogConfigPage /> },
        { path: "logs/:id", element: <LogDetailsPage /> },
        { path: "settings", element: <SettingsPage /> },
        { path: "contents", element: <ContentsListPage /> },
        { path: "contents/new", element: <ContentCreatePage /> },
        { path: "contents/:id", element: <ContentEditPage /> },
        { path: "categories", element: <CategoriesListPage /> },
        { path: "tags", element: <TagsListPage /> },
        { path: "media", element: <MediaLibraryPage /> },
        { path: "profile", element: <ProfilePage /> },
        { path: "security-audit", element: <SecurityAuditPage /> },
        { path: "analytics", element: <AnalyticsPage /> },
        { path: "spa-test", element: <SpaTestPage /> },
        { path: "*", element: <NotFoundPage /> },
      ],
    },
  ],
  {
    basename: "/",
  },
);
