import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// Custom plugin from official GUN.js docs to exclude Node.js specific polyfills.
// This prevents Vite from bundling a large, unnecessary 'text-encoding' library.
const moduleExclude = (match: string) => {
  const m = (id: string) => id.indexOf(match) > -1
  return {
    name: `exclude-${match}`,
    resolveId(id: string) {
      if (m(id)) return id
    },
    load(id: string) {
      if (m(id)) return `export default {}`
    },
  }
}

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    react(), 
    tailwindcss(),
    moduleExclude('text-encoding'),
  ],
  // This section is critical for making GUN.js work with Vite.
  // It tells Vite to pre-bundle these specific files from the 'gun' package,
  // making them available for ES6 module imports in the application.
  optimizeDeps: {
    include: [
      'gun',
      'gun/gun',
      'gun/sea',
      'gun/sea.js',
      'gun/lib/then',
      'gun/lib/webrtc',
      'gun/lib/radix',
      'gun/lib/radisk',
      'gun/lib/store',
      'gun/lib/rindexed',
    ],
  },
})
