export type FeedSearchScope = 'q' | 'artist' | 'music' | 'tag' | 'city'

export type AppRoute =
     | { kind: 'radio' }
     | { kind: 'about' }
     | { kind: 'feedList'; page: number }
     | {
            kind: 'feedSearch'
            page: number
            scope: FeedSearchScope
            query: string
       }
     | { kind: 'feedPost'; slug: string }
     | { kind: 'notFound'; path: string }

type RouteChangeHandler = (route: AppRoute) => void

interface NavigateOptions {
     replace?: boolean
}

let routeChangeHandler: RouteChangeHandler | null = null
let isRouterInitialized = false

const feedSearchScopes: FeedSearchScope[] = ['q', 'artist', 'music', 'tag', 'city']

const normalizePathname = (pathname: string): string => {
     const withLeadingSlash = pathname.startsWith('/') ? pathname : `/${pathname}`
     const withoutTrailingSlash = withLeadingSlash.replace(/\/+$/, '')

     return withoutTrailingSlash || '/'
}

const stripWrappingQuotes = (value: string): string => {
     const trimmed = value.trim()
     const first = trimmed[0]
     const last = trimmed[trimmed.length - 1]

     if (
          trimmed.length >= 2 &&
          ((first === '"' && last === '"') || (first === "'" && last === "'"))
     ) {
          return trimmed.slice(1, -1).trim()
     }

     return trimmed
}

const parsePositivePage = (value: string | null): number | null => {
     if (value === null) return 1
     if (!/^[1-9]\d*$/.test(value)) return null

     return Number(value)
}

const parseFeedSearchRoute = (path: string, search: string): AppRoute => {
     const params = new URLSearchParams(search)
     const page = parsePositivePage(params.get('page'))

     if (page === null) {
          return { kind: 'notFound', path: `${path}${search}` }
     }

     const searchEntries = feedSearchScopes.map((scope) => ({
          scope,
          query: stripWrappingQuotes(params.get(scope) ?? ''),
          isPresent: params.has(scope),
     }))
     const selected =
          searchEntries.find((entry) => entry.isPresent && entry.query) ??
          searchEntries.find((entry) => entry.isPresent) ??
          { scope: 'q' as FeedSearchScope, query: '', isPresent: false }

     return {
          kind: 'feedSearch',
          page,
          scope: selected.scope,
          query: selected.query,
     }
}

export const parseRoute = (pathname: string, search = ''): AppRoute => {
     const path = normalizePathname(pathname)

     if (path === '/' || path === '/radio') {
          return { kind: 'radio' }
     }

     if (path === '/about') {
          return { kind: 'about' }
     }

     const segments = path.slice(1).split('/')

     if (segments[0] !== 'feed') {
          return { kind: 'notFound', path }
     }

     if (segments.length === 1) {
          return { kind: 'feedList', page: 1 }
     }

     if (segments.length === 2 && segments[1] === 'search') {
          return parseFeedSearchRoute(path, search)
     }

     if (segments[1] === 'page') {
          const page = segments[2]

          if (segments.length === 3 && /^[1-9]\d*$/.test(page)) {
               return { kind: 'feedList', page: Number(page) }
          }

          return { kind: 'notFound', path }
     }

     const slug = segments[1]

     if (segments.length === 2 && /^[a-z0-9-]+$/.test(slug)) {
          return { kind: 'feedPost', slug }
     }

     return { kind: 'notFound', path }
}

const getCurrentUrlPath = (): string =>
     `${window.location.pathname}${window.location.search}${window.location.hash}`

const getUrlPath = (url: URL): string =>
     `${url.pathname}${url.search}${url.hash}`

const renderCurrentRoute = () => {
     routeChangeHandler?.(
          parseRoute(window.location.pathname, window.location.search)
     )
}

export const navigateTo = (path: string, options: NavigateOptions = {}) => {
     const url = new URL(path, window.location.href)

     if (url.origin !== window.location.origin) {
          window.location.href = url.href
          return
     }

     const nextUrlPath = getUrlPath(url)
     const currentUrlPath = getCurrentUrlPath()
     const route = parseRoute(url.pathname, url.search)
     const state = { route }

     if (options.replace) {
          window.history.replaceState(state, '', nextUrlPath)
     } else if (nextUrlPath !== currentUrlPath) {
          window.history.pushState(state, '', nextUrlPath)
     }

     routeChangeHandler?.(route)
}

const isHashOnlyNavigation = (url: URL): boolean =>
     url.pathname === window.location.pathname &&
     url.search === window.location.search &&
     url.hash !== ''

const shouldIgnoreClick = (event: MouseEvent, anchor: HTMLAnchorElement) => {
     if (event.defaultPrevented || event.button !== 0) return true
     if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey)
          return true
     if (anchor.hasAttribute('download')) return true
     if (anchor.target && anchor.target.toLowerCase() !== '_self') return true

     return false
}

const onDocumentClick = (event: MouseEvent) => {
     if (!(event.target instanceof Element)) return

     const anchor = event.target.closest('a')
     if (!(anchor instanceof HTMLAnchorElement)) return
     if (shouldIgnoreClick(event, anchor)) return

     const href = anchor.getAttribute('href')
     if (!href) return

     const url = new URL(href, window.location.href)

     if (url.origin !== window.location.origin) return
     if (isHashOnlyNavigation(url)) return

     event.preventDefault()
     navigateTo(getUrlPath(url))
}

export const initRouter = (onRouteChange: RouteChangeHandler) => {
     routeChangeHandler = onRouteChange

     if (!isRouterInitialized) {
          document.addEventListener('click', onDocumentClick)
          window.addEventListener('popstate', renderCurrentRoute)
          isRouterInitialized = true
     }

     window.history.replaceState(
          { route: parseRoute(window.location.pathname, window.location.search) },
          '',
          getCurrentUrlPath()
     )
     renderCurrentRoute()
}
