# Settings Site Config Design

## Goal

Admin `/settings` should let an admin configure site-level blog settings, and `www` should use those settings for public rendering and default SEO metadata.

This first version covers only site-level defaults. It does not add article-level SEO controls, a separate SEO tab, sitemap management, robots management, search verification, favicon upload, or image processing.

## Current State

`/settings` has two tabs:

- `General`
- `Security`

`General` currently stores:

- `siteName`
- `siteDescription`
- `adminEmail`
- `timezone`
- `language`
- `maintenanceMode`

`Security` currently stores:

- `jwtExpiresIn`
- `jwtRefreshGraceSeconds`

The security settings are already consumed by auth runtime code. `jwtExpiresIn` controls token TTL and `jwtRefreshGraceSeconds` controls the refresh grace window. Environment variables still take precedence.

`www` currently hardcodes public site branding in its layout and does not consume site settings.

## Decision

Do not add a separate `SEO` tab in the first version.

Site-level default SEO belongs in `General` because the first version only needs values that are already general site identity:

- site name
- site description
- site URL
- favicon URL

A separate SEO tab would duplicate `siteName` and `siteDescription` or introduce fields that are not yet consumed.

## General Settings

`General` should contain:

- `siteName`: public site name.
- `siteDescription`: public site description and default meta description.
- `siteUrl`: absolute public origin/base URL, without a trailing slash preferred.
- `faviconUrl`: optional favicon URL.
- `adminEmail`: contact/admin email.
- `timezone`: default timezone for public date formatting.
- `language`: default public document language.
- `maintenanceMode`: when enabled, public `www` renders a maintenance page.

`siteUrl` and `faviconUrl` are new fields.

`faviconUrl` is a plain optional URL string in this version. The admin UI can use a normal URL input. Media-library selection can be added later if needed.

## Public API

Add a public settings response that exposes only fields safe for `www`:

- `siteName`
- `siteDescription`
- `siteUrl`
- `faviconUrl`
- `timezone`
- `language`
- `maintenanceMode`

Do not expose `adminEmail` publicly in this endpoint.

The response contract belongs in `packages/shared` because it is shared by server and `www`.

## Admin API

Update the existing admin settings contract and route for `General` to include:

- `siteUrl`
- `faviconUrl`

Validation:

- `siteUrl` must be a valid URL.
- `faviconUrl` may be an empty string or a valid URL.
- Existing validation for the other general fields remains.

The existing settings table can store these new keys as JSON values. No migration change is needed.

## Server Settings Service

Update `SettingsService.getGeneralSettings()` defaults:

- `siteUrl`: empty string.
- `faviconUrl`: empty string.

Update `saveGeneralSettings()` to persist both new fields when provided.

Add a public-safe settings getter or mapping that excludes `adminEmail`.

## www Consumption

`www` should fetch public settings in the root layout server load and pass them to the layout.

The root layout should use:

- `siteName` for header title and default `<title>`.
- `siteDescription` for header subtitle and default meta description.
- `siteUrl` to build a canonical URL when configured.
- `faviconUrl` for `<link rel="icon">` when configured.
- `language` for the document language path supported by the app structure.
- `maintenanceMode` to render a public maintenance view.

Page-specific content can still override title and description later. This spec only covers site-level defaults.

## Security Tab

Keep `Security` unchanged in this first version:

- `jwtExpiresIn`
- `jwtRefreshGraceSeconds`

Do not add security audit, brute-force, or event-retention settings to `/settings/security` now. Those belong with `/security-audit` if they become configurable.

## Error Handling

If public settings cannot be loaded, `www` should fall back to safe defaults rather than fail the public site:

- `siteName`: `Worker Blog`
- `siteDescription`: `A modern headless CMS powered by AI`
- `siteUrl`: empty string
- `faviconUrl`: empty string
- `timezone`: `UTC`
- `language`: `en`
- `maintenanceMode`: `false`

Admin settings save failures should keep the existing error behavior.

## Testing

Add focused tests for:

- shared validation accepting `siteUrl` and empty/valid `faviconUrl`
- shared validation rejecting invalid URLs
- server settings defaults including new fields
- admin settings route returning and saving new fields
- public settings endpoint excluding `adminEmail`

For `www`, add the smallest practical check available in the package for the settings fetch helper or layout load behavior.

## Deferred

- Separate SEO tab.
- Article-level SEO title and description controls.
- Default Open Graph image.
- Favicon upload, cropping, or multi-size generation.
- Search verification fields.
- Robots and sitemap management.
- Security audit settings inside `/settings/security`.
