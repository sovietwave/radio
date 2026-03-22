import fs from 'fs'
import path from 'path'
import type { IncomingMessage, ServerResponse } from 'http'
import type { Plugin } from 'vite'

type BackgroundManifestEntry = {
     path: string
     tags: string[]
     mobilePath: string | null
}

type BackgroundManifestFile = {
     entries: BackgroundManifestEntry[]
}

type BackgroundAdminPayload = {
     entries: Array<
          BackgroundManifestEntry & {
               folder: string
               hasMobile: boolean
          }
     >
     folders: string[]
     tags: string[]
}

const ADMIN_ROUTE = '/__bg-admin'
const API_ROUTE = '/__bg-admin/api/manifest'
const MANIFEST_RELATIVE_PATH = path.join('src', 'data', 'backgrounds.json')
const PUBLIC_BG_PREFIX = '/assets/sprites/bg/'
const IMAGE_EXTENSION_RE = /\.(png|jpe?g|webp|gif|avif)$/i

const toPosixPath = (value: string) => value.replace(/\\/g, '/')

const isDesktopBackgroundPath = (publicPath: string) =>
     publicPath.startsWith(PUBLIC_BG_PREFIX) && !publicPath.includes('/mobile/')

const normalizeTags = (tags: unknown): string[] => {
     if (!Array.isArray(tags)) return []

     const normalized: string[] = []

     for (const rawTag of tags) {
          if (typeof rawTag != 'string') continue

          const tag = rawTag.trim()
          if (!tag || normalized.includes(tag)) continue

          normalized.push(tag)
     }

     return normalized
}

const getManifestPath = (root: string) =>
     path.join(root, MANIFEST_RELATIVE_PATH)

const getPublicRoot = (root: string) => path.join(root, 'public')

const getBackgroundRoot = (root: string) =>
     path.join(root, 'public', 'assets', 'sprites', 'bg')

const toPublicPath = (root: string, filePath: string) =>
     '/' + toPosixPath(path.relative(getPublicRoot(root), filePath))

const getFolderLabel = (publicPath: string) => {
     const relativePath = publicPath.replace(PUBLIC_BG_PREFIX, '')
     const parts = relativePath.split('/')
     parts.pop()

     return parts.length > 0 ? parts.join('/') : '(root)'
}

const deriveMobilePath = (root: string, publicPath: string) => {
     const relativePath = publicPath.replace(PUBLIC_BG_PREFIX, '')
     const parts = relativePath.split('/')
     const fileName = parts.pop()

     if (!fileName) return null

     const candidatePublicPath =
          parts.length == 0
               ? `${PUBLIC_BG_PREFIX}mobile/${fileName}`
               : `${PUBLIC_BG_PREFIX}${parts.join('/')}/mobile/${fileName}`

     const candidateFilePath = path.join(
          getPublicRoot(root),
          candidatePublicPath.replace(/^\//, '')
     )

     return fs.existsSync(candidateFilePath) ? candidatePublicPath : null
}

const scanDesktopBackgrounds = (root: string) => {
     const backgroundsRoot = getBackgroundRoot(root)
     const publicPaths: string[] = []

     const walk = (dirPath: string) => {
          for (const dirent of fs.readdirSync(dirPath, { withFileTypes: true })) {
               const nextPath = path.join(dirPath, dirent.name)

               if (dirent.isDirectory()) {
                    walk(nextPath)
                    continue
               }

               if (!IMAGE_EXTENSION_RE.test(dirent.name)) continue

               const publicPath = toPublicPath(root, nextPath)
               if (!isDesktopBackgroundPath(publicPath)) continue

               publicPaths.push(publicPath)
          }
     }

     walk(backgroundsRoot)

     return publicPaths.sort((left, right) => left.localeCompare(right, 'ru'))
}

const normalizeEntry = (
     root: string,
     publicPath: string,
     tags: unknown
): BackgroundManifestEntry => ({
     path: publicPath,
     tags: normalizeTags(tags),
     mobilePath: deriveMobilePath(root, publicPath),
})

const readManifest = (root: string): BackgroundManifestFile => {
     const manifestPath = getManifestPath(root)

     if (!fs.existsSync(manifestPath)) {
          return { entries: [] }
     }

     try {
          const parsed = JSON.parse(
               fs.readFileSync(manifestPath, 'utf8')
          ) as Partial<BackgroundManifestFile>

          if (!Array.isArray(parsed.entries)) {
               return { entries: [] }
          }

          return {
               entries: parsed.entries
                    .filter(
                         (entry): entry is BackgroundManifestEntry =>
                              Boolean(entry && typeof entry.path == 'string')
                    )
                    .map((entry) => normalizeEntry(root, entry.path, entry.tags)),
          }
     } catch {
          return { entries: [] }
     }
}

const hydrateManifest = (root: string) => {
     const scannedPaths = scanDesktopBackgrounds(root)
     const scannedSet = new Set(scannedPaths)
     const seen = new Set<string>()
     const hydratedEntries: BackgroundManifestEntry[] = []

     for (const entry of readManifest(root).entries) {
          if (!scannedSet.has(entry.path) || seen.has(entry.path)) continue

          hydratedEntries.push(normalizeEntry(root, entry.path, entry.tags))
          seen.add(entry.path)
     }

     for (const publicPath of scannedPaths) {
          if (seen.has(publicPath)) continue

          hydratedEntries.push(normalizeEntry(root, publicPath, []))
     }

     return { entries: hydratedEntries }
}

const writeManifest = (root: string, entries: unknown) => {
     const scannedPaths = scanDesktopBackgrounds(root)
     const scannedSet = new Set(scannedPaths)
     const seen = new Set<string>()
     const normalizedEntries: BackgroundManifestEntry[] = []

     if (Array.isArray(entries)) {
          for (const rawEntry of entries) {
               if (
                    !rawEntry ||
                    typeof rawEntry != 'object' ||
                    typeof rawEntry.path != 'string'
               ) {
                    continue
               }

               if (!scannedSet.has(rawEntry.path) || seen.has(rawEntry.path)) {
                    continue
               }

               normalizedEntries.push(
                    normalizeEntry(root, rawEntry.path, rawEntry.tags)
               )
               seen.add(rawEntry.path)
          }
     }

     for (const publicPath of scannedPaths) {
          if (seen.has(publicPath)) continue

          normalizedEntries.push(normalizeEntry(root, publicPath, []))
     }

     fs.writeFileSync(
          getManifestPath(root),
          JSON.stringify({ entries: normalizedEntries }, null, 4) + '\n',
          'utf8'
     )

     return { entries: normalizedEntries }
}

const toPayload = (manifest: BackgroundManifestFile): BackgroundAdminPayload => {
     const tags = new Set<string>()
     const folders = new Set<string>()

     const entries = manifest.entries.map((entry) => {
          const folder = getFolderLabel(entry.path)
          folders.add(folder)

          for (const tag of entry.tags) {
               tags.add(tag)
          }

          return {
               ...entry,
               folder,
               hasMobile: Boolean(entry.mobilePath),
          }
     })

     return {
          entries,
          folders: [...folders].sort((left, right) =>
               left.localeCompare(right, 'ru')
          ),
          tags: [...tags].sort((left, right) => left.localeCompare(right, 'ru')),
     }
}

const sendJson = (
     response: ServerResponse,
     statusCode: number,
     payload: unknown
) => {
     response.statusCode = statusCode
     response.setHeader('Content-Type', 'application/json; charset=utf-8')
     response.end(JSON.stringify(payload))
}

const sendHtml = (response: ServerResponse, html: string) => {
     response.statusCode = 200
     response.setHeader('Content-Type', 'text/html; charset=utf-8')
     response.end(html)
}

const readRequestBody = (request: IncomingMessage) =>
     new Promise<string>((resolve, reject) => {
          const chunks: Buffer[] = []

          request.on('data', (chunk) => {
               chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk))
          })
          request.on('end', () => {
               resolve(Buffer.concat(chunks).toString('utf8'))
          })
          request.on('error', reject)
     })

const createAdminHtml = () => `<!DOCTYPE html>
<html lang="ru">
<head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Background Admin</title>
    <script type="module" src="/src/dev/bg-admin.ts"></script>
</head>
<body>
    <div id="app"></div>
</body>
</html>`

export const backgroundAdminPlugin = (): Plugin => ({
     name: 'background-admin',
     configureServer(server) {
          server.middlewares.use(async (request, response, next) => {
               const requestPath = request.url?.split('?')[0] || ''

               if (
                    requestPath != ADMIN_ROUTE &&
                    requestPath != `${ADMIN_ROUTE}/` &&
                    requestPath != API_ROUTE
               ) {
                    next()
                    return
               }

               const root = server.config.root

               try {
                    if (
                         requestPath == ADMIN_ROUTE ||
                         requestPath == `${ADMIN_ROUTE}/`
                    ) {
                         sendHtml(response, createAdminHtml())
                         return
                    }

                    if (request.method == 'GET') {
                         sendJson(response, 200, toPayload(hydrateManifest(root)))
                         return
                    }

                    if (request.method == 'POST') {
                         const rawBody = await readRequestBody(request)
                         const payload = rawBody ? JSON.parse(rawBody) : {}
                         sendJson(
                              response,
                              200,
                              toPayload(writeManifest(root, payload.entries))
                         )
                         return
                    }

                    sendJson(response, 405, {
                         error: 'Method not allowed',
                    })
               } catch (error) {
                    const message =
                         error instanceof Error ? error.message : 'Unknown error'

                    sendJson(response, 500, {
                         error: message,
                    })
               }
          })
     },
})
