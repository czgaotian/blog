import type { WorkerBlogConfig } from '../app'

export const appConfig: WorkerBlogConfig = {
  collections: {
    directory: './src/collections',
    autoSync: true,
  },
}
