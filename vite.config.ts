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
        safari: (10 << 16), // Safari 10 does not support any modern color functions
        chrome: (60 << 16) // Chrome 60 does not support any modern color functions
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
