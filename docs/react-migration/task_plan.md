# Admin SPA Migration Execution Plan

Source plan: `docs/react-migration/admin-react-migration-plan.md`

## Current Scope

Phase 4 complete. Phase 5 complete (content, media, forms). Phase 6 complete (collections). Phase 7 complete (remove legacy HTML routes). All planned phases complete.

## Tasks

### Phase 1: SPA Infrastructure

- [x] Review migration plan and execution constraints.
- [x] Attempt isolated worktree setup.
- [x] Capture baseline repo shape and test commands.
- [x] Add admin Vite React SPA skeleton.
- [x] Add admin API client, CSRF helper, router, and minimal `/admin/spa-test` route.
- [x] Add server `/admin/api/me`.
- [x] Add server SPA assets/shell routing without breaking legacy admin routes.
- [x] Update `wrangler.toml` assets config and R2 binding.
- [x] Run verification commands and record results.

### Phase 2: UI Foundation and Layout

- [x] Extend `/admin/api/me` bootstrap metadata to use configured app name.
- [x] Add first reusable SPA UI primitives: button, badge, alert, page header.
- [x] Update SPA admin layout to consume app metadata, user role, and plugin menu JSON.
- [x] Keep business/admin pages as legacy links during this phase.
- [x] Add more reusable table, pagination, filter, loading, and error boundary primitives.
- [x] Add dark mode toggle and persisted theme behavior.
- [x] Add frontend test harness for admin package and theme persistence coverage.
- [ ] Add dialog primitive when a migrated workflow needs confirmation/modal behavior.

### Phase 3: Low-Risk Page Migration

- [x] Add shared response types: DashboardResponse, LogsListResponse, LogDetailsResponse, LogConfigResponse, PluginsListResponse, ApiReferenceResponse.
- [x] Add GET /admin/api/dashboard (stats + activity + metrics consolidated).
- [x] Add GET /admin/api/logs, /logs/config, /logs/:id.
- [x] Add GET /admin/api/plugins.
- [x] Add GET /admin/api/api-reference.
- [x] Add React Query hooks for all 4 feature areas.
- [x] Add React pages: dashboard, logs-list, log-details, log-config, api-reference, plugins-list.
- [x] Wire 6 new routes into SPA router.
- [x] Remove legacy: true from migrated nav items (Dashboard, Plugins, API Reference). Added Logs nav item.

### Phase 4: Form Page Migration

- [x] Add shared types: SettingsResponse, UpdateGeneralSettingsRequest, UpdateSecuritySettingsRequest, UsersListResponse, UserDetailResponse, CreateUserRequest, UpdateUserRequest, PluginSettingsResponse, UpdatePluginSettingsRequest.
- [x] Add GET/PUT /admin/api/settings (general + security tabs).
- [x] Add GET /admin/api/users, GET/PATCH/DELETE /admin/api/users/:id, POST /admin/api/users.
- [x] Add GET/PUT /admin/api/plugin-settings/:id/settings.
- [x] Add React Query hooks: useSettings, useUpdateGeneralSettings, useUpdateSecuritySettings, useUsersList, useUserDetail, useUpdateUser, useDeleteUser, usePluginSettings, useUpdatePluginSettings.
- [x] Add React pages: SettingsPage (general+security tabs), UsersListPage, UserEditPage, PluginSettingsPage.
- [x] Wire 4 new route groups into SPA router (settings, users, users/:id/edit, plugins/:id/settings).
- [x] Remove legacy: true from Users and Settings nav items.
- [x] Add Button destructive variant, Alert success tone, Input and Label UI primitives.

### Phase 5: Complex Page Migration

- [x] Add shared types: ContentListResponse, ContentDetailResponse, ContentVersionsResponse, MutateContentResponse, FormsListResponse, FormDetailResponse, MutateFormResponse, MediaListResponse, MediaDetailResponse, UploadMediaResponse, MutateMediaResponse.
- [x] Add server routes: adminApiContentRoutes (GET/POST/PUT/DELETE /admin/api/content, GET /:id/versions, POST /:id/restore/:version), adminApiFormsRoutes (GET/POST/PUT/DELETE /admin/api/forms), adminApiMediaRoutes (GET/POST/PUT/DELETE /admin/api/media, POST /upload).
- [x] Mount new routes in app.ts at /admin/api/content, /admin/api/forms, /admin/api/media.
- [x] Add React Query hooks: useContentList, useContentDetail, useContentVersions, useCreateContent, useUpdateContent, useDeleteContent, useRestoreContentVersion, useFormsList, useFormDetail, useCreateForm, useUpdateForm, useDeleteForm, useMediaList, useMediaDetail, useUploadMedia, useUpdateMedia, useDeleteMedia.
- [x] Add React pages: ContentListPage, FormsListPage, MediaLibraryPage.
- [x] Wire content, forms, media routes into SPA router.
- [x] Add Forms nav item; remove legacy: true from Content and Media nav items.

### Phase 6: Collections Migration

- [x] Add shared types: CollectionListItem, CollectionsListResponse, CollectionDetailResponse, CollectionField, CreateCollectionRequest, UpdateCollectionRequest, CreateFieldRequest, UpdateFieldRequest, MutateCollectionResponse.
- [x] Add server route adminApiCollectionsRoutes with full CRUD for collections and fields (POST/PUT/DELETE /:id/fields).
- [x] Mount /admin/api/collections before adminApiRoutes in app.ts.
- [x] Add Dialog UI primitive.
- [x] Add React Query hooks: useCollectionsList, useCollectionDetail, useCreateCollection, useUpdateCollection, useDeleteCollection, useCreateField, useUpdateField, useDeleteField.
- [x] Add React pages: CollectionsListPage, CollectionEditPage (with inline field management via Dialog).
- [x] Wire 3 routes into SPA router; remove legacy: true from Collections nav item.

### Phase 7: Remove Legacy HTML Routes

- [x] Add shared types: UserProfileResponse, UpdateProfileRequest, ChangePasswordRequest, MutateProfileResponse, ActivityLogItem, ActivityLogsListResponse.
- [x] Add server route adminApiProfileRoutes (GET/PUT /profile, POST /profile/password, POST /profile/avatar) — auth-only, no admin role required.
- [x] Add activity-log endpoints to adminApiUsersRoutes (GET/GET-export /activity-logs).
- [x] Mount /admin/api/profile before adminApiRoutes in app.ts.
- [x] Add React Query hooks: useProfile, useUpdateProfile, useChangePassword, useUploadAvatar, useActivityLogs, activityLogsExportUrl.
- [x] Add React pages: ProfilePage, ActivityLogsPage.
- [x] Wire /admin/profile and /admin/activity-logs into SPA router; add Profile and Activity Logs nav items.
- [x] Remove all legacy HTML route exports from routes/index.ts and mounts from app.ts.
- [x] Delete 16 legacy admin-*.ts route files (admin-content, admin-users, admin-dashboard, admin-media, admin-forms, admin-collections, admin-plugins, admin-logs, admin-settings, admin-api-reference, admin-code-examples, admin-testimonials, admin-design, admin-checkboxes, admin-collections-field-types, admin-content-field-types).
- [ ] Delete packages/admin/src/templates/ — blocked: templates still used by auth routes (login/register) and plugin admin pages (cache, analytics, security-audit, stripe, workflow, user-profiles, email-templates, database-tools, redirect-management). Requires migrating those to SPA first.

- Worktree creation was requested by the user, but sandbox blocked branch/worktree creation because `.git` is read-only. Continue in current checkout with scoped edits.
- Keep legacy admin templates and routes intact for Phase 1.
- Phase 2 starts with a thin shell/layout increment before migrating any business page.
- Avoid adding a frontend test stack in this increment; use existing server Vitest coverage plus type-check/build verification.
- Added a minimal admin Vitest harness once theme persistence needed logic-level coverage.
- Defer dialog until the first migrated mutating workflow needs confirm/modal behavior.
- Phase 3 scope: all 6 pages — dashboard, logs list, log details, log config (display only), api-reference, plugins list.
- Dashboard consolidates HTMX fragments into a single `GET /admin/api/dashboard` endpoint returning stats, storage, recent-activity, and system-status in one response.
- Log config mutations (POST /config/:category, cleanup) deferred to Phase 4; Phase 3 only renders the config read-only.

## Errors Encountered

| Error | Attempt | Resolution |
| --- | --- | --- |
| `git worktree add` failed: `.git/refs/heads/...lock` read-only filesystem | Create isolated worktree | Added `.worktrees/` to `.gitignore`; sandbox still blocked branch creation. Continue in current checkout. |
| `pnpm type-check` failed resolving `vite/client` | Admin type-check | Moved Vite client reference from `compilerOptions.types` to `src/spa/vite-env.d.ts`. |
| `curl http://localhost:8788/admin/spa-test` failed to connect | Wrangler smoke check | Wrangler printed ready and bindings; sandbox curl could not reach the local server. Recorded as environment limitation. |
