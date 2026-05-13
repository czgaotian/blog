/**
 * Hello World Plugin
 *
 * A simple demonstration plugin that shows "Hello World" on a page
 */

import { Hono } from 'hono'
import { PluginBuilder } from '../../sdk/plugin-builder'
import type { Plugin } from '@worker-blog/shared/types/plugin'

export function createHelloWorldPlugin(): Plugin {
  const builder = PluginBuilder.create({
    name: 'hello-world',
    version: '1.0.0-beta.1',
    description: 'A simple Hello World plugin demonstration'
  })

  // Add plugin metadata
  builder.metadata({
    author: {
      name: 'Worker Blog Team',
      email: 'team@worker-blog.com'
    },
    license: 'MIT',
    compatibility: '^2.0.0'
  })

  // Create the Hello World route
  const helloWorldRoutes = new Hono()

  helloWorldRoutes.get('/', async (c: any) => {
    const user = c.get('user') as { email?: string; role?: string } | undefined

    return c.json({
      plugin: 'hello-world',
      version: '1.0.0-beta.1',
      message: 'Hello World',
      user: user?.email || null,
      role: user?.role || null,
    })
  })

  // Register the route
  builder.addRoute('/api/hello-world', helloWorldRoutes, {
    description: 'Hello World API',
    requiresAuth: true,
    priority: 90
  })

  // Add menu item (this will appear in the left navigation)
  builder.addMenuItem('Hello World', '/admin/hello-world', {
    icon: 'hand-raised',
    order: 90,
    permissions: ['hello-world:view']
  })

  // Add lifecycle hooks
  builder.lifecycle({
    activate: async () => {
      console.info('✅ Hello World plugin activated')
    },

    deactivate: async () => {
      console.info('❌ Hello World plugin deactivated')
    }
  })

  return builder.build() as Plugin as Plugin
}

// Export the plugin instance
export const helloWorldPlugin = createHelloWorldPlugin()
