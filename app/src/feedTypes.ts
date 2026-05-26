export type PublicFeedLinkType =
     | 'bandcamp'
     | 'soundcloud'
     | 'vk'
     | 'youtube'
     | 'telegram'
     | 'yandex-music'
     | 'spotify'
     | 'source'
     | 'other'

export interface PublicFeedIndex {
     version: 1
     generatedAt: string
     pageSize: number
     posts: PublicFeedPost[]
}

export interface PublicFeedPost {
     id: string
     slug: string
     artist: string
     title: string
     city: string
     date: string
     dateSortKey: number | null
     tags: string[]
     image: PublicFeedAsset | null
     tracks: PublicFeedTrack[]
     links: PublicFeedLink[]
}

export interface PublicFeedAsset {
     url: string
     name: string
     width?: number
     height?: number
}

export interface PublicFeedTrack {
     id: string
     title: string
     artist: string
     duration: number | null
     audioUrl: string
}

export interface PublicFeedLink {
     type: PublicFeedLinkType
     url: string
     label: string
}
