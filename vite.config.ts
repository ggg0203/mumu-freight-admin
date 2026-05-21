import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { resolve } from 'path';
import { VitePWA } from 'vite-plugin-pwa';

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    // ★★★ PWA 离线可安装 ★★★
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['icons/*.svg'],
      manifest: {
        name: '幕幕货运管理系统',
        short_name: '幕幕货运',
        description: '幕幕货运 - 智能物流管理系统',
        theme_color: '#1677ff',
        background_color: '#ffffff',
        display: 'standalone',
        scope: '/',
        start_url: '/',
        icons: [
          {
            src: 'icons/icon-192x192.svg',
            sizes: '192x192',
            type: 'image/svg+xml',
          },
          {
            src: 'icons/icon-512x512.svg',
            sizes: '512x512',
            type: 'image/svg+xml',
          },
          {
            src: 'icons/icon-512x512.svg',
            sizes: '512x512',
            type: 'image/svg+xml',
            purpose: 'maskable',
          },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,png,ico,json}'],
        // 排除第三方 CDN 请求（腾讯地图 SDK 等），避免 Service Worker 拦截
        navigateFallbackDenylist: [/^\/mapapi/, /map\.qq\.com/],
      },
    }),
  ],

  // ★★★ 注入环境变量到客户端 ★★★
  define: {
    'import.meta.env.VITE_DASHSCOPE_API_KEY': JSON.stringify(process.env.DASHSCOPE_API_KEY),
  },

  // ★★★ 路径别名配置：可以使用 @/ 代替 src/ 目录 ★★★
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src'),
    },
  },

  // ★★★ 开发服务器配置 ★★★
  server: {
    port: 3000, // 开发服务器端口
    open: true, // 自动打开浏览器

    // ★★★ 代理配置：将 /api 请求代理到后端服务器 ★★★
    proxy: {
      '/api': {
        target: 'http://localhost:8080',
        changeOrigin: true,
      },
      // ★★★ 腾讯地图 API 代理（避免 CORS 问题）★★★
      '/mapapi': {
        target: 'https://apis.map.qq.com',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/mapapi/, '/ws/direction/v1/driving'),
      },
    },
  },
});
