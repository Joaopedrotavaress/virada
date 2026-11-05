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
        name: 'Virada',
        short_name: 'Virada',
        description: 'Toda partida tem um ponto de virada. Ache o seu.',
        lang: 'pt-BR',
        start_url: '/',
        scope: '/',
        display: 'standalone',
        theme_color: '#0b0b0d',
        background_color: '#0b0b0d',
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
        // O backend local responde pela mesma origem: isso nunca pode virar a página do app.
        navigateFallbackDenylist: [/^\/api\//],
      },
    }),
  ],
  test: { environment: 'node', include: ['src/**/*.test.ts'], testTimeout: 120_000, hookTimeout: 180_000 },
})
