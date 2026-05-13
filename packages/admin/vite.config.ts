import { defineConfig, type PluginOption } from 'vite'
import react from '@vitejs/plugin-react'
import { cloudflare } from '@cloudflare/vite-plugin'

export default defineConfig(({ mode }) => {
  const plugins: PluginOption[] = [react()]

  if (mode !== 'test') {
    plugins.push(cloudflare({
      configPath: '../server/wrangler.toml',
    }))
  }

  return {
    base: '/admin/',
    plugins,
    build: {
      manifest: true,
      outDir: 'dist',
      emptyOutDir: true,
    },
    resolve: {
      alias: {
        '@': new URL('./src/spa', import.meta.url).pathname,
      },
    },
  }
})
