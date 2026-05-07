/**
 * Default Worker Blog server application entrypoint.
 */

import { createWorkerBlogApp } from './app'
import { registerCollections } from './services'
import { appConfig } from './config/app'
import blogPostsCollection from './collections/blog-posts.collection'

registerCollections([
  blogPostsCollection,
])

export default createWorkerBlogApp(appConfig)
