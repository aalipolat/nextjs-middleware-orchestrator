import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { defineConfig } from 'vite'
import dts from 'vite-plugin-dts'

const __dirname = dirname(fileURLToPath(import.meta.url))

export default defineConfig({
  plugins: [dts({
    insertTypesEntry: true
  })],
  build: {
    lib: {
      entry: resolve(__dirname, 'src/main.ts'),
      name: 'Nextjs Middleware Orchestrator',
      fileName: 'nextjs-middleware-orchestrator',
    },
    rollupOptions: {
      external: [ 'next' ],
      output: {
        globals: {
          'next': 'Next'
        }
      }
    },
  },
})