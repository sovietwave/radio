import { defineConfig, Terser } from 'vite'
import { VitePWA } from 'vite-plugin-pwa'
import fs from 'fs'
import path from 'path'

const getTerserOptions = (command: string): Terser.MinifyOptions => {
     if (command === 'build') {
          return {
               parse: {
                    html5_comments: false,
                    shebang: false,
               },
               format: {
                    comments: false,
                    shebang: false,
               },
               compress: {
                    booleans_as_integers: true,
                    sequences: 1000000,
                    passes: 1000000,
               },
               mangle: {
                    properties: {
                         regex: /^_[a-z]/,
                    },
               },
          }
     }
}

export default ({ command }) =>
     defineConfig({
          build: {
               minify: 'terser',
               terserOptions: getTerserOptions(command),
               assetsInlineLimit: 0,
               assetsDir: '',
               reportCompressedSize: false,
               modulePreload: false,
               rollupOptions: {
                    external: ['jquery'],
                    output: {
                         globals: {
                              jquery: '$',
                         },
                    },
               },
          },
          server: {
               port: 8080,
               open: true,
          },
          plugins: [
               VitePWA({
                    registerType: 'autoUpdate',
                    devOptions: {
                         enabled: true,
                    },
                    workbox: {
                         clientsClaim: true,
                         skipWaiting: true,
                    },
                    manifest: {
                         name: 'Советская Волна',
                         short_name: 'SW',
                         start_url: '/',
                         theme_color: '#ffffff',
                         id: '/',
                         icons: [
                              {
                                   src: '/assets/sprites/favicons/android-chrome-192x192.png',
                                   sizes: '192x192',
                                   type: 'image/png',
                              },
                              {
                                   src: '/assets/sprites/favicons/android-chrome-512x512.png',
                                   sizes: '512x512',
                                   type: 'image/png',
                              },
                         ],
                         background_color: '#ffffff',
                         display: 'standalone',
                         scope: '/',
                         lang: 'ru',
                         description:
                              'Современная отечественная музыка, вдохновлённая мечтами из прошлого',
                    },
               }),
          ],
     })
