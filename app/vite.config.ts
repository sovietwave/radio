import fs from 'fs'
import type { ServerResponse } from 'http'
import path from 'path'
import { defineConfig, Terser, type Plugin } from 'vite'
import { VitePWA } from 'vite-plugin-pwa'
import { backgroundAdminPlugin } from './backgroundAdminPlugin'

const FEED_MEDIA_PREFIX = '/feed/media/'
const DEFAULT_FEED_MEDIA_ROOT = 'D:\\YandexDisk\\obsidian\\Sovietwave\\База\\Посты'

const getExistingFeedMediaRoot = () => {
     const candidates = [
          process.env.PUBLIC_FEED_MEDIA_ROOT?.trim(),
          DEFAULT_FEED_MEDIA_ROOT,
     ].filter((candidate): candidate is string => Boolean(candidate))

     return candidates.find((candidate) => fs.existsSync(candidate)) || ''
}

const getContentType = (filePath: string) => {
     const extension = path.extname(filePath).toLowerCase()

     if (extension === '.mp3') return 'audio/mpeg'
     if (extension === '.jpg' || extension === '.jpeg') return 'image/jpeg'
     if (extension === '.png') return 'image/png'
     if (extension === '.webp') return 'image/webp'
     if (extension === '.gif') return 'image/gif'

     return 'application/octet-stream'
}

const sendStatus = (
     response: ServerResponse,
     statusCode: number,
     message: string
) => {
     response.statusCode = statusCode
     response.end(message)
}

const resolveFeedMediaPath = (root: string, requestPath: string) => {
     let decodedPath: string

     try {
          decodedPath = decodeURIComponent(requestPath.slice(FEED_MEDIA_PREFIX.length))
     } catch {
          return null
     }

     if (!decodedPath || decodedPath.includes('\0')) return null

     const mediaRoot = path.resolve(root)
     const filePath = path.resolve(mediaRoot, decodedPath.replace(/\//g, path.sep))
     const relativePath = path.relative(mediaRoot, filePath)

     if (
          !relativePath ||
          relativePath.startsWith('..') ||
          path.isAbsolute(relativePath)
     ) {
          return null
     }

     return filePath
}

const getRangeBounds = (rangeHeader: string, fileSize: number) => {
     const match = /^bytes=(\d*)-(\d*)$/.exec(rangeHeader)
     if (!match) return null

     const [, rawStart, rawEnd] = match
     let start: number
     let end: number

     if (!rawStart && !rawEnd) return null

     if (!rawStart) {
          const suffixLength = Number(rawEnd)
          if (!Number.isInteger(suffixLength) || suffixLength <= 0) return null

          start = Math.max(0, fileSize - suffixLength)
          end = fileSize - 1
     } else {
          start = Number(rawStart)
          end = rawEnd ? Number(rawEnd) : fileSize - 1
     }

     if (
          !Number.isInteger(start) ||
          !Number.isInteger(end) ||
          start < 0 ||
          end < start ||
          start >= fileSize
     ) {
          return null
     }

     return {
          start,
          end: Math.min(end, fileSize - 1),
     }
}

const feedMediaDevPlugin = (): Plugin | null => {
     const mediaRoot = getExistingFeedMediaRoot()

     return {
          name: 'feed-media-dev',
          configureServer(server) {
               server.middlewares.use((request, response, next) => {
                    const requestPath = request.url?.split('?')[0] || ''

                    if (!requestPath.startsWith(FEED_MEDIA_PREFIX)) {
                         next()
                         return
                    }

                    if (request.method !== 'GET' && request.method !== 'HEAD') {
                         sendStatus(response, 405, 'Method not allowed')
                         return
                    }

                    if (!mediaRoot) {
                         sendStatus(response, 404, 'Feed media root not configured')
                         return
                    }

                    const filePath = resolveFeedMediaPath(mediaRoot, requestPath)
                    if (!filePath) {
                         sendStatus(response, 404, 'Feed media not found')
                         return
                    }

                    fs.stat(filePath, (statError, stat) => {
                         if (statError || !stat.isFile()) {
                              sendStatus(response, 404, 'Feed media not found')
                              return
                         }

                         const contentType = getContentType(filePath)
                         const range = request.headers.range

                         response.setHeader('Accept-Ranges', 'bytes')
                         response.setHeader('Content-Type', contentType)

                         if (range) {
                              const bounds = getRangeBounds(range, stat.size)

                              if (!bounds) {
                                   response.statusCode = 416
                                   response.setHeader(
                                        'Content-Range',
                                        `bytes */${stat.size}`
                                   )
                                   response.end()
                                   return
                              }

                              const contentLength = bounds.end - bounds.start + 1

                              response.statusCode = 206
                              response.setHeader(
                                   'Content-Range',
                                   `bytes ${bounds.start}-${bounds.end}/${stat.size}`
                              )
                              response.setHeader('Content-Length', `${contentLength}`)

                              if (request.method === 'HEAD') {
                                   response.end()
                                   return
                              }

                              fs.createReadStream(filePath, bounds).pipe(response)
                              return
                         }

                         response.statusCode = 200
                         response.setHeader('Content-Length', `${stat.size}`)

                         if (request.method === 'HEAD') {
                              response.end()
                              return
                         }

                         fs.createReadStream(filePath).pipe(response)
                    })
               })
          },
     }
}

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
               ...(command === 'serve'
                    ? [backgroundAdminPlugin(), feedMediaDevPlugin()].filter(
                           (plugin): plugin is Plugin => plugin !== null
                      )
                    : []),
               VitePWA({
                    registerType: 'autoUpdate',
                    workbox: {
                         clientsClaim: true,
                         skipWaiting: true,
                         globPatterns: ['**/*.{js,css,html,ico,png,svg,wav,mp3}'],
                         globIgnores: ['feed/media/**/*'],
                    },
                    manifest: {
                         name: 'Советская Волна #sovietwave',
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
