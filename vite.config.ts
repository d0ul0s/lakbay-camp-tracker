import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  css: {
    transformer: 'lightningcss',
    lightningcss: {
      targets: {
        safari: (12 << 16), // Safari 12 does not support lab/oklch
        chrome: (80 << 16) // Chrome 80 does not support lab/oklch
      }
    }
  },
  build: {
    cssMinify: 'lightningcss'
  },
  server: {
    proxy: {
      '/api': {
        target: 'http://localhost:5000',
        changeOrigin: true,
      }
    }
  }
})
