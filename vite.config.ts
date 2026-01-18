import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// 1. The Cleanup Plugin (Fixes the HTML for production)
const aiStudioCleanup = () => {
  return {
    name: 'ai-studio-cleanup',
    transformIndexHtml(html: string) {
      if (process.env.NODE_ENV !== 'production') return html;
      return html
        .replace(/<script type="importmap">[\s\S]*?<\/script>/, '')
        .replace(/<script src="https:\/\/cdn\.tailwindcss\.com"><\/script>/, '')
        .replace(/<script type="module">[\s\S]*?process[\s\S]*?<\/script>/, '');
    }
  }
}

// 2. The Gun.js Plugin (Fixes the polyfills)
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
    aiStudioCleanup(), // <--- Clean HTML on build
  ],
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
      'elkjs/lib/elk-api.js',
      'elkjs/lib/elk.bundled.js',
      'elkjs/lib/elk-worker.js',
    ],
  },
  // 3. The Build Config (Fixes the "Large Chunk" warning)
  build: {
    sourcemap: true,
    rollupOptions: {
      output: {
        manualChunks: {
          'vendor-react': ['react', 'react-dom'],
          'vendor-konva': ['konva', 'react-konva'],
          'vendor-gun': ['gun'],
        },
      },
    },
    chunkSizeWarningLimit: 2000,
  },
  server: {
    proxy: {
      '/gun': {
        target: 'http://localhost:8080',
        ws: true,
      },
    },
  },
  worker: {
    format: 'es',
    plugins: () => [moduleExclude('text-encoding')],
  },
})