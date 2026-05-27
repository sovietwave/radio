import { loadPublicFeedIndex } from './feedData'
import type { PublicFeedPost, PublicFeedTrack } from './feedTypes'
import type { AppRoute } from './router'

const MAX_PAGE_SIZE = 12
const MAX_VISIBLE_TAGS = 3
const SITE_TITLE = 'Советская Волна #sovietwave'

let renderToken = 0

const createElement = <K extends keyof HTMLElementTagNameMap>(
     tagName: K,
     className?: string,
     textContent?: string
): HTMLElementTagNameMap[K] => {
     const element = document.createElement(tagName)

     if (className) element.className = className
     if (textContent !== undefined) element.textContent = textContent

     return element
}

const createLink = (href: string, textContent: string): HTMLAnchorElement => {
     const link = createElement('a', 'feed-action', textContent)
     link.href = href

     return link
}

const createTopChrome = () => {
     const chrome = createElement('header', 'feed-chrome')
     const nav = createElement('nav', 'feed-chrome-nav')
     const radioLink = createElement('a', 'feed-radio-link')
     const logoLink = createElement('a', 'feed-logo-link')
     const logo = createElement('img', 'feed-logo')

     nav.setAttribute('aria-label', 'Навигация ленты')
     radioLink.href = '/radio'
     radioLink.setAttribute('aria-label', 'Вернуться к радио')
     radioLink.title = 'Радио'
     radioLink.append(
          createElement('span', 'feed-radio-icon', ''),
          createElement('span', 'feed-radio-text', 'Радио')
     )

     logo.src = '/assets/sprites/logo.svg'
     logo.alt = 'Советская Волна'
     logoLink.href = '/feed'
     logoLink.className = 'feed-logo-link'
     logoLink.append(logo)

     nav.append(radioLink)
     chrome.append(nav, logoLink)

     return chrome
}

const renderView = (children: Node[]) => {
     const root = document.getElementById('feed-view')
     if (!root) return

     root.replaceChildren(createTopChrome(), ...children)
}

const renderShell = (
     title: string,
     summary: string,
     actions: HTMLAnchorElement[]
) => {
     const routeView = createElement('article', 'feed-route feed-state')
     const heading = createElement('h1', 'feed-title', title)
     const summaryElement = createElement('p', 'feed-summary', summary)
     const actionsElement = createElement('nav', 'feed-actions')

     actionsElement.setAttribute('aria-label', 'Навигация раздела')
     actionsElement.replaceChildren(...actions)
     routeView.replaceChildren(heading, summaryElement, actionsElement)
     renderView([routeView])
}

const normalizeText = (value: string): string => value.trim()

const getDisplayArtist = (post: PublicFeedPost): string =>
     normalizeText(post.artist) || normalizeText(post.title) || 'Советская Волна'

const getDisplayTitle = (post: PublicFeedPost): string => {
     const artist = normalizeText(post.artist).toLowerCase()
     const title = normalizeText(post.title)

     if (artist && title.toLowerCase().startsWith(`${artist} - `)) {
          return title.slice(artist.length + 3).trim()
     }

     return title || post.tracks[0]?.title || 'Без названия'
}

const createCoverPlaceholder = (): HTMLElement =>
     createElement('div', 'feed-cover-placeholder')

const createCover = (post: PublicFeedPost): HTMLElement => {
     const cover = createElement('div', 'feed-cover')

     cover.append(createCoverPlaceholder())

     if (post.image) {
          const image = createElement('img', 'feed-cover-image')

          image.src = post.image.url
          image.alt = `${getDisplayArtist(post)} - ${getDisplayTitle(post)}`
          image.loading = 'lazy'
          image.addEventListener('load', () => {
               cover.classList.add('feed-cover-loaded')
          })
          image.addEventListener('error', () => {
               cover.classList.add('feed-cover-missing')
               image.remove()
          })
          cover.append(image)
     } else {
          cover.classList.add('feed-cover-missing')
     }

     return cover
}

const createTrackList = (post: PublicFeedPost): HTMLElement => {
     const list = createElement('ul', 'feed-post-tracks')
     const tracks = post.tracks.length
          ? post.tracks.map((track) => normalizeText(track.title) || getDisplayTitle(post))
          : [getDisplayTitle(post)]

     tracks.forEach((trackTitle, index) => {
          const item = createElement('li', 'feed-post-track')
          item.textContent = trackTitle

          if (index === 0 && post.tracks.length > 0) {
               item.classList.add('feed-post-track-primary')
          }

          list.append(item)
     })

     return list
}

const createMeta = (post: PublicFeedPost): HTMLElement => {
     const meta = createElement('div', 'feed-post-footer')
     const city = normalizeText(post.city)

     if (city) meta.append(createElement('span', 'feed-post-location', city))

     return meta
}

const createTags = (post: PublicFeedPost): HTMLElement[] => {
     const tags: HTMLElement[] = []

     post.tags.slice(0, MAX_VISIBLE_TAGS).forEach((tag) => {
          const value = normalizeText(tag)
          if (!value) return

          tags.push(createElement('span', 'feed-post-tag', `#${value}`))
     })

     return tags
}

export const handleFeedCardPlay = (
     post: PublicFeedPost,
     track: PublicFeedTrack
) => {
     const detail = { post, track }

     window.dispatchEvent(new CustomEvent('feed:play-track-request', { detail }))
}

const createPostCard = (post: PublicFeedPost): HTMLAnchorElement => {
     const link = createElement('a', 'feed-post')
     const content = createElement('div', 'feed-post-content')
     const main = createElement('div', 'feed-post-main')
     const artist = createElement('h2', 'feed-post-artist', getDisplayArtist(post))
     const meta = createMeta(post)

     link.href = `/feed/${post.slug}`
     link.setAttribute('aria-label', `${getDisplayArtist(post)} - ${getDisplayTitle(post)}`)

     main.append(artist, createTrackList(post))
     content.append(main)
     createTags(post).forEach((tag) => meta.append(tag))
     if (meta.childNodes.length > 0) content.append(meta)

     link.append(createCover(post), content)

     return link
}

const getPageHref = (page: number): string =>
     page <= 1 ? '/feed' : `/feed/page/${page}`

const createPagination = (page: number, totalPages: number): HTMLElement => {
     const pagination = createElement('nav', 'feed-pagination')
     pagination.setAttribute('aria-label', 'Страницы ленты')

     const previous =
          page > 1
               ? createLink(getPageHref(page - 1), '←')
               : createElement('span', 'feed-action feed-action-disabled', '←')
     previous.setAttribute('aria-label', 'Предыдущая страница')

     const pageList = createElement('div', 'feed-page-list')
     const next =
          page < totalPages
               ? createLink(getPageHref(page + 1), '→')
               : createElement('span', 'feed-action feed-action-disabled', '→')
     next.setAttribute('aria-label', 'Следующая страница')

     for (let index = 1; index <= totalPages; index++) {
          const item =
               index === page
                    ? createElement('span', 'feed-page-link feed-page-link-current', `${index}`)
                    : createLink(getPageHref(index), `${index}`)

          if (index === page) item.setAttribute('aria-current', 'page')
          item.classList.add('feed-page-link')
          pageList.append(item)
     }

     pagination.append(previous, pageList, next)

     return pagination
}

const renderFeedList = (page: number, posts: PublicFeedPost[], pageSize: number) => {
     if (posts.length === 0) {
          renderShell('Пока нет опубликованных постов', 'Лента пуста', [
               createLink('/radio', 'Радио'),
          ])
          return
     }

     const normalizedPageSize = Math.min(Math.max(pageSize, 1), MAX_PAGE_SIZE)
     const totalPages = Math.max(1, Math.ceil(posts.length / normalizedPageSize))

     if (page > totalPages) {
          document.title = `Страница не найдена | ${SITE_TITLE}`
          renderShell('Страница не найдена', `В ленте всего ${totalPages}`, [
               createLink('/feed', 'К ленте'),
          ])
          return
     }

     const start = (page - 1) * normalizedPageSize
     const pagePosts = posts.slice(start, start + normalizedPageSize)
     const layout = createElement('section', 'feed-list-view')
     const list = createElement('div', 'feed-list')

     pagePosts.forEach((post) => {
          list.append(createPostCard(post))
     })

     layout.append(list, createPagination(page, totalPages))
     renderView([layout])
}

const renderFeedListRoute = async (route: { page: number }) => {
     const token = ++renderToken

     renderShell('Загрузка ленты...', 'Получаем публикации', [])

     try {
          const index = await loadPublicFeedIndex()

          if (token !== renderToken) return
          renderFeedList(route.page, index.posts, index.pageSize)
     } catch {
          if (token !== renderToken) return
          renderShell('Не удалось загрузить ленту', 'Попробуйте обновить страницу', [
               createLink('/feed', 'Повторить'),
               createLink('/radio', 'Радио'),
          ])
     }
}

export const renderFeedRoute = (route: AppRoute) => {
     switch (route.kind) {
          case 'feedList':
               void renderFeedListRoute(route)
               return

          case 'feedPost':
               ++renderToken
               renderShell(`Пост ${route.slug}`, 'Страница поста будет в Milestone 5', [
                    createLink('/feed', 'Лента'),
               ])
               return

          case 'notFound':
               ++renderToken
               renderShell('Страница не найдена', route.path, [
                    createLink('/radio', 'Радио'),
                    createLink('/feed', 'Лента'),
               ])
               return

          case 'radio':
               ++renderToken
               document.getElementById('feed-view')?.replaceChildren()
               return
     }
}
