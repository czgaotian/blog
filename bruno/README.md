# Worker Blog API Bruno Collection

Use the `local` environment, then run `Auth/Login` first. On an empty database, run `Auth/Register` once to create the first admin account.

`Auth/Login` tries to save the returned JWT into `authToken`. If your Bruno version does not run the post-response script, copy the `token` value from the login response into the `authToken` environment variable manually.

For create/update requests:

- Set `collectionId` after creating or listing collections.
- Set `contentId` after creating or listing content.
- Set `mediaFile` to a local file path before using upload requests.
- Mutating admin requests use `Authorization: Bearer {{authToken}}`, so they do not need a CSRF header.

This collection mirrors the slim CMS API surface and intentionally excludes deleted demo, seed, database-tool, user-management, and admin-media endpoints.
