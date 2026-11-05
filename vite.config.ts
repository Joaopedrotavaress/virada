import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      // A pessoa decide quando atualizar: nunca recarrega no meio de uma partida.
      registerType: 'prompt',
      includeAssets: ['icons/apple-touch-icon.png'],
      manifest: {
        name: 'Treinador de Xadrez',
        short_name: 'Treinador',
        description: 'Analise suas partidas e jogue contra bots com Stockfish rodando no aparelho.',
        lang: 'pt-BR',
        start_url: '/',
        scope: '/',
        display: 'standalone',
        theme_color: '#16202b',
        background_color: '#11171d',
        icons: [
          { src: 'icons/icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icons/icon-512.png', sizes: '512x512', type: 'image/png' },
          { src: 'icons/icon-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        // Já na primeira visita a página passa a ser servida pelo cache, sem precisar recarregar.
        clientsClaim: true,
        // Tudo que o app precisa para funcionar sem internet, inclusive o Stockfish.
        globPatterns: ['**/*.{js,css,html,wasm,woff2,png,svg,txt}'],
        // Alfabetos que o português não usa continuam sob demanda, fora do cache inicial.
        globIgnores: ['**/*-{cyrillic,cyrillic-ext,greek,greek-ext,vietnamese}-*.woff2'],
        maximumFileSizeToCacheInBytes: 5 * 1024 * 1024,
        navigateFallback: 'index.html',
      },
    }),
  ],
  test: { environment: 'node', include: ['src/**/*.test.ts'], testTimeout: 120_000, hookTimeout: 180_000 },
})
