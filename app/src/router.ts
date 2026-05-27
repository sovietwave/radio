export type AppRoute =
     | { kind: 'radio' }
     | { kind: 'feedList'; page: number }
     | { kind: 'feedPost'; slug: string }
     | { kind: 'notFound'; path: string }

type RouteChangeHandler = (route: AppRoute) => void

interface NavigateOptions {
     replace?: boolean
}

let routeChangeHandler: RouteChangeHandler | null = null
let isRouterInitialized = false

const normalizePathname = (pathname: string): string => {
     const withLeadingSlash = pathname.startsWith('/') ? pathname : `/${pathname}`
     const withoutTrailingSlash = withLeadingSlash.replace(/\/+$/, '')

     return withoutTrailingSlash || '/'
}

export const parseRoute = (pathname: string): AppRoute => {
     const path = normalizePathname(pathname)

     if (path === '/' || path === '/radio') {
          return { kind: 'radio' }
     }

     const segments = path.slice(1).split('/')

     if (segments[0] !== 'feed') {
          return { kind: 'notFound', path }
     }

     if (segments.length === 1) {
          return { kind: 'feedList', page: 1 }
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
     routeChangeHandler?.(parseRoute(window.location.pathname))
}

export const navigateTo = (path: string, options: NavigateOptions = {}) => {
     const url = new URL(path, window.location.href)

     if (url.origin !== window.location.origin) {
          window.location.href = url.href
          return
     }

     const nextUrlPath = getUrlPath(url)
     const currentUrlPath = getCurrentUrlPath()
     const route = parseRoute(url.pathname)
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
          { route: parseRoute(window.location.pathname) },
          '',
          getCurrentUrlPath()
     )
     renderCurrentRoute()
}
