# Admin Content MVP Implementation Plan

## Goal

Complete the admin content-management workflow using the existing APIs, with a textarea as the first editor implementation.

## Phases

1. Archive the previous plan and record the current content-management architecture. Status: complete.
2. Add missing admin data hooks, form models, and UI primitives. Status: complete.
3. Upgrade the content list with navigation, URL-backed filters, and deletion. Status: complete.
4. Implement reusable content form, create/edit pages, cover selection, and version history. Status: complete.
5. Add focused tests and run admin test, type-check, and build. Status: complete.

## Decisions

- Reuse existing Content, Category, Tag, Media, and Version APIs.
- Keep metadata unchanged while editing because it is not exposed in the MVP form.
- Use a plain textarea for the content body.
- Do not modify database schema or migration files.
- Keep admin UI copy in English.

## Errors Encountered

- Initial admin type-check found a required create metadata field and edit-page narrowing errors; fixed by sending empty metadata on create and narrowing loaded content before rendering.
- The shadcn CLI initially added the `radix-ui` umbrella dependency; replaced it with the repository-consistent `@radix-ui/react-select` and `@radix-ui/react-checkbox` packages.
