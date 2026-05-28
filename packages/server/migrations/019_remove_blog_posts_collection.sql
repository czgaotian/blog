-- Migration: Remove legacy blog_posts seed collection
-- Description: Remove the old blog-posts-collection seed data from pre-lightweight installs.
-- Created: 2025-11-04

-- Delete content associated with blog-posts-collection
DELETE FROM content WHERE collection_id = 'blog-posts-collection';

-- Delete content fields for blog-posts-collection
DELETE FROM content_fields WHERE collection_id = 'blog-posts-collection';

-- Delete the blog-posts collection itself
DELETE FROM collections WHERE id = 'blog-posts-collection';

-- New installs define collections from the admin UI.
