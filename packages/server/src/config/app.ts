import type { WorkerBlogConfig } from '../app'
import { pluginConfig } from './plugins'

export const appConfig: WorkerBlogConfig = {
  collections: {
    directory: './src/collections',
    autoSync: true,
  },
  plugins: pluginConfig,
}
