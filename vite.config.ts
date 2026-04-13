import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  base: '/MyToDo/',
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      manifest: {
        name: 'MyToDo',
        short_name: 'MyToDo',
        description: '自分専用タスク管理',
        theme_color: '#6366f1',
        background_color: '#f0f4ff',
        display: 'standalone',
        icons: [
          { src: '/icon.svg', sizes: 'any', type: 'image/svg+xml' }
        ]
      }
    })
  ],
})
