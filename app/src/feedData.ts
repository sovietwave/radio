import type { PublicFeedIndex, PublicFeedPost } from './feedTypes'

let feedIndexPromise: Promise<PublicFeedIndex> | null = null

const isObject = (value: unknown): value is Record<string, unknown> =>
     typeof value === 'object' && value !== null

const isPost = (value: unknown): value is PublicFeedPost => {
     if (!isObject(value)) return false

     return (
          typeof value.id === 'string' &&
          typeof value.slug === 'string' &&
          typeof value.artist === 'string' &&
          typeof value.title === 'string' &&
          typeof value.city === 'string' &&
          typeof value.date === 'string' &&
          Array.isArray(value.tags) &&
          Array.isArray(value.tracks) &&
          Array.isArray(value.links)
     )
}

const validateFeedIndex = (value: unknown): PublicFeedIndex => {
     if (!isObject(value)) {
          throw new Error('Public feed index is not an object')
     }

     if (value.version !== 1) {
          throw new Error('Unsupported public feed index version')
     }

     if (typeof value.pageSize !== 'number' || value.pageSize < 1) {
          throw new Error('Public feed index has invalid pageSize')
     }

     if (!Array.isArray(value.posts) || !value.posts.every(isPost)) {
          throw new Error('Public feed index has invalid posts')
     }

     return value as PublicFeedIndex
}

export const loadPublicFeedIndex = async (): Promise<PublicFeedIndex> => {
     if (!feedIndexPromise) {
          feedIndexPromise = fetch('/feed/index.json', {
               headers: {
                    Accept: 'application/json',
               },
          })
               .then((response) => {
                    if (!response.ok) {
                         throw new Error(
                              `Failed to load public feed: ${response.status}`
                         )
                    }

                    return response.json()
               })
               .then(validateFeedIndex)
               .catch((error) => {
                    feedIndexPromise = null
                    throw error
               })
     }

     return feedIndexPromise
}
