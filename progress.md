# Admin Content MVP Progress

## 2026-06-04

- Inspected the admin routes, content list, API hooks, shared contracts, server content routes, taxonomy APIs, media APIs, and available UI primitives.
- Confirmed the backend already supports the complete MVP workflow.
- Archived the previous lightweight CMS cleanup planning files under `.planning/2026-05-25-lightweight-cms-server-cleanup/`.
- Started Phase 2: admin data hooks, form models, and UI primitives.
- Added taxonomy hooks, content form conversion/validation helpers, and URL-backed content-list filter helpers.
- Added Card, Select, and Checkbox UI primitives through the shadcn CLI.
- Implemented the reusable content form, cover-image picker, confirmation dialog, and version history.
- Implemented content create/edit routes and upgraded the list with URL filters, navigation, actions, and deletion.
- Ran admin type-check once; fixed the reported create metadata and edit-page narrowing issues.
- Added focused tests for form conversion, metadata preservation, scheduled publishing validation, and URL filter serialization.
- Added shared unsaved-change handling for browser close and internal SPA navigation.
- Corrected the default list filter so it excludes deleted content unless Deleted is selected explicitly.
- Replaced the shadcn-generated `radix-ui` umbrella dependency with standalone Select and Checkbox Radix dependencies.
- Final verification passed: 4 test files / 11 tests, admin type-check, admin build, and `git diff --check`.
- Admin build retains the pre-existing warning that the main client chunk exceeds 500 kB.
