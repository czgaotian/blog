import type { WorkerBlogConfig } from '../app'

export const pluginConfig: NonNullable<WorkerBlogConfig['plugins']> = {
  directory: './src/plugins',
  autoLoad: false,
}
