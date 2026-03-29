import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import {defineConfig, loadEnv} from 'vite';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig(({mode}) => {
  const env = loadEnv(mode, '.', '');
  return {
    plugins: [
      {
        name: 'radar-dev-api-hint',
        configureServer(s) {
          s.httpServer?.once('listening', () => {
            const p = s.config.server.port ?? 5173;
            console.log(
              `\n  [Vite :${p}] /api/* → proxy http://127.0.0.1:3000\n  Deixe \`npm run dev\` rodando (porta 3000) ou use só http://localhost:3000\n`
            );
          });
        },
      },
      react(), 
      tailwindcss(),
      VitePWA({
        registerType: 'autoUpdate',
        includeAssets: ['pwa-192x192.png', 'pwa-512x512.png', 'apple-touch-icon.png', 'mask-icon.svg'],
        manifest: {
          name: 'Radar de Cria — Mapa do Tesouro',
          short_name: 'Radar de Cria',
          description:
            'Varredura de negócios por região e segmento: seu mapa do tesouro para prospecção (app, site, WhatsApp).',
          theme_color: '#0f2726',
          background_color: '#0a1a19',
          display: 'standalone',
          orientation: 'portrait-primary',
          lang: 'pt-BR',
          icons: [
            {
              src: 'pwa-192x192.png',
              sizes: '192x192',
              type: 'image/png',
              purpose: 'any',
            },
            {
              src: 'pwa-512x512.png',
              sizes: '512x512',
              type: 'image/png',
              purpose: 'any',
            },
            {
              src: 'pwa-512x512.png',
              sizes: '512x512',
              type: 'image/png',
              purpose: 'maskable',
            },
          ],
        },
        workbox: {
          maximumFileSizeToCacheInBytes: 4 * 1024 * 1024,
        },
      })
    ],
    define: {
      'process.env.GEMINI_API_KEY': JSON.stringify(env.GEMINI_API_KEY),
    },
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    server: {
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      // Do not modifyâfile watching is disabled to prevent flickering during agent edits.
      hmr: process.env.DISABLE_HMR !== 'true',
      proxy: {
        '/api': {
          target: 'http://127.0.0.1:3000',
          changeOrigin: true,
        },
      },
    },
  };
});
