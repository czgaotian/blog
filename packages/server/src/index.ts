/**
 * Default Worker Blog server application entrypoint.
 */

import { createWorkerBlogApp } from './app'
import { appConfig } from './config/app'

export default createWorkerBlogApp(appConfig)
