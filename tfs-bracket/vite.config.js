import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import { execSync } from 'child_process'

function getVersion() {
  try {
    return execSync("git tag --list 'beta-*' --sort=-version:refname | head -1", { encoding: 'utf8' }).trim()
  } catch {
    return 'beta-v0.2'
  }
}

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  define: {
    __APP_VERSION__: JSON.stringify(getVersion()),
  },
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: './src/test/setup.js',
    css: true,
  },
})
