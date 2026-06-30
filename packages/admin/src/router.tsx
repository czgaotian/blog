import { createBrowserRouter, Navigate } from "react-router";
import { AuthLayout } from "./layouts/auth-layout";
import { BaseLayout } from "./layouts/base-layout";
import { AnalyticsPage } from "./pages/analytics";
import { LoginPage } from "./pages/auth/login";
import { RegisterPage } from "./pages/auth/register";
import { CategoriesListPage } from "./pages/categories-list";
import { ContentCreatePage } from "./pages/content-create";
import { ContentEditPage } from "./pages/content-edit";
import { ContentsListPage } from "./pages/contents-list";
import { DashboardPage } from "./pages/dashboard";
import { LogConfigPage } from "./pages/log-config";
import { LogDetailsPage } from "./pages/log-details";
import { LogsListPage } from "./pages/logs-list";
import { MediaLibraryPage } from "./pages/media-library";
import { NotFoundPage } from "./pages/not-found";
import { ProfilePage } from "./pages/profile";
import { SecurityAuditPage } from "./pages/security-audit";
import { SettingsPage } from "./pages/settings";
import { TagsListPage } from "./pages/tags-list";

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
        { path: "*", element: <NotFoundPage /> },
      ],
    },
  ],
  {
    basename: "/",
  },
);
