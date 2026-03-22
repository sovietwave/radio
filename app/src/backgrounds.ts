import backgroundManifest from './data/backgrounds.json'

export type BackgroundManifestEntry = {
     path: string
     tags: string[]
     mobilePath: string | null
}

export type BackgroundManifestFile = {
     entries: BackgroundManifestEntry[]
}

export type BackgroundModeAssets = {
     backs: string[]
     backs_mobile: string[]
}

const streamBackgrounds = [
     '/stream/day.jpg',
     '/stream/evening.jpg',
     '/stream/midnight.jpg',
     '/stream/night.jpg',
]

const manifest = backgroundManifest as BackgroundManifestFile

export const backgroundManifestEntries = manifest.entries

export const buildBackgroundAssetsByMode = (
     entries: BackgroundManifestEntry[]
): Record<string, BackgroundModeAssets> => {
     const assetsByMode: Record<string, BackgroundModeAssets> = {}

     for (const entry of entries) {
          const mobilePath = entry.mobilePath || entry.path

          for (const rawTag of entry.tags) {
               const tag = rawTag.trim()
               if (!tag) continue

               if (!assetsByMode[tag]) {
                    assetsByMode[tag] = {
                         backs: [],
                         backs_mobile: [],
                    }
               }

               assetsByMode[tag].backs.push(entry.path)
               assetsByMode[tag].backs_mobile.push(mobilePath)
          }
     }

     assetsByMode.stream = {
          backs: [...streamBackgrounds],
          backs_mobile: [...streamBackgrounds],
     }

     return assetsByMode
}

export const backgroundAssetsByMode =
     buildBackgroundAssetsByMode(backgroundManifestEntries)
