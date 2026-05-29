import { loadPublicFeedIndex } from './feedData'
import type { PublicFeedLink, PublicFeedPost, PublicFeedTrack } from './feedTypes'
import { feedPlayerGetState, type FeedPlayerState } from './feedPlayer'
import { navigateTo, type AppRoute } from './router'

const MAX_PAGE_SIZE = 12
const MAX_VISIBLE_TAGS = 3
const SITE_TITLE = 'Советская Волна #sovietwave'
const ICON_LINK_FILE_BY_TYPE: Partial<Record<PublicFeedLink['type'], string>> = {
     bandcamp: 'bandcamp',
     soundcloud: 'soundcloud',
     spotify: 'spotify',
     telegram: 'telegram',
     vk: 'vk',
     youtube: 'youtube',
     'yandex-music': 'yandex',
}
const activeListTrackClass = 'feed-post-track-active'
const activeDetailTrackClass = 'feed-detail-track-active'
const playingListTrackClass = 'feed-post-track-playing'
const playingDetailTrackClass = 'feed-detail-track-playing'
const coverLightboxPadding = 24
const coverLightboxTransitionMs = 360

let renderToken = 0
let previousRouteKind: AppRoute['kind'] | null = null
let activeCoverLightboxClose: (() => void) | null = null

interface TopChromeOptions {
     showBackButton?: boolean
     useHistoryBack?: boolean
}

interface CoverLightboxRect {
     left: number
     top: number
     width: number
     height: number
}

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

const handleTopChromeBackClick = (useHistoryBack: boolean) => {
     if (useHistoryBack && window.history.length > 1) {
          window.history.back()
          return
     }

     navigateTo('/feed')
}

const createTopChrome = (options: TopChromeOptions = {}) => {
     const chrome = createElement('header', 'feed-chrome')
     const nav = createElement('nav', 'feed-chrome-nav')
     const logoLink = createElement('a', 'feed-logo-link')
     const logo = createElement('img', 'feed-logo')

     nav.setAttribute('aria-label', 'Навигация ленты')

     if (options.showBackButton) {
          const backButton = createElement('button', 'feed-back-button', '<')

          backButton.type = 'button'
          backButton.title = 'Назад'
          backButton.setAttribute('aria-label', 'Вернуться назад')
          backButton.addEventListener('click', () => {
               handleTopChromeBackClick(Boolean(options.useHistoryBack))
          })
          nav.append(backButton)
     }

     logo.src = '/assets/sprites/logo.svg'
     logo.alt = 'Советская Волна'
     logoLink.href = '/feed'
     logoLink.className = 'feed-logo-link'
     logoLink.append(logo)

     if (nav.childNodes.length > 0) chrome.append(nav)
     chrome.append(logoLink)

     return chrome
}

const renderView = (children: Node[], options: TopChromeOptions = {}) => {
     const root = document.getElementById('feed-view')
     if (!root) return

     root.classList.toggle('feed-view-detail', Boolean(options.showBackButton))
     root.replaceChildren(createTopChrome(options), ...children)
}

const renderShell = (
     title: string,
     summary: string,
     actions: HTMLAnchorElement[]
) => {
     const routeView = createElement('article', 'feed-route feed-state')
     const heading = createElement('h1', 'feed-title feed-text-heading', title)
     const summaryElement = createElement(
          'p',
          'feed-summary feed-text-subheading',
          summary
     )
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

const getPostDocumentTitle = (post: PublicFeedPost): string => {
     const artist = normalizeText(post.artist)
     const title = getDisplayTitle(post)

     return artist ? `${getDisplayArtist(post)} - ${title}` : title
}

const getTrackTitle = (post: PublicFeedPost, track: PublicFeedTrack): string =>
     normalizeText(track.title) || getDisplayTitle(post)

const getTrackArtist = (post: PublicFeedPost, track: PublicFeedTrack): string =>
     normalizeText(track.artist) || getDisplayArtist(post)

const getTrackKey = (post: PublicFeedPost, track: PublicFeedTrack): string =>
     `${post.slug}:${track.id}`

const getActiveTrackKey = (state: FeedPlayerState): string | null =>
     state.post && state.track ? getTrackKey(state.post, state.track) : null

const updateActiveTrackElements = (state: FeedPlayerState) => {
     const activeTrackKey = getActiveTrackKey(state)

     document
          .querySelectorAll<HTMLButtonElement>('[data-feed-track-key]')
          .forEach((button) => {
               const isActive = button.dataset.feedTrackKey === activeTrackKey
               const isPlaying = isActive && state.status === 'playing'
               const isDetailTrack = button.classList.contains('feed-detail-track')

               button.classList.toggle(
                    isDetailTrack ? activeDetailTrackClass : activeListTrackClass,
                    isActive
               )
               button.classList.toggle(
                    isDetailTrack ? playingDetailTrackClass : playingListTrackClass,
                    isPlaying
               )
               button.setAttribute('aria-pressed', isActive ? 'true' : 'false')
          })
}

window.addEventListener('feed-player:state-change', (event) => {
     updateActiveTrackElements((event as CustomEvent<FeedPlayerState>).detail)
})

const createCoverPlaceholder = (): HTMLElement =>
     createElement('div', 'feed-cover-placeholder')

const toCoverLightboxRect = (rect: DOMRect): CoverLightboxRect => ({
     left: rect.left,
     top: rect.top,
     width: rect.width,
     height: rect.height,
})

const getCoverLightboxTargetRect = (
     image: HTMLImageElement,
     fallbackRect: CoverLightboxRect
): CoverLightboxRect => {
     const naturalWidth =
          image.naturalWidth > 0 ? image.naturalWidth : fallbackRect.width
     const naturalHeight =
          image.naturalHeight > 0 ? image.naturalHeight : fallbackRect.height
     const maxWidth = Math.max(1, window.innerWidth - coverLightboxPadding * 2)
     const maxHeight = Math.max(1, window.innerHeight - coverLightboxPadding * 2)
     const scale = Math.min(1, maxWidth / naturalWidth, maxHeight / naturalHeight)
     const width = naturalWidth * scale
     const height = naturalHeight * scale

     return {
          left: (window.innerWidth - width) / 2,
          top: (window.innerHeight - height) / 2,
          width,
          height,
     }
}

const setCoverLightboxImageRect = (
     image: HTMLImageElement,
     rect: CoverLightboxRect
) => {
     image.style.left = `${rect.left}px`
     image.style.top = `${rect.top}px`
     image.style.width = `${rect.width}px`
     image.style.height = `${rect.height}px`
}

const openCoverLightbox = (cover: HTMLElement) => {
     const sourceImage = cover.querySelector<HTMLImageElement>('.feed-cover-image')
     if (!sourceImage || !sourceImage.src) return

     if (activeCoverLightboxClose) activeCoverLightboxClose()

     const startRect = toCoverLightboxRect(cover.getBoundingClientRect())
     const targetRect = getCoverLightboxTargetRect(sourceImage, startRect)
     const overlay = createElement('div', 'feed-cover-lightbox')
     const backdrop = createElement('div', 'feed-cover-lightbox-backdrop')
     const lightboxImage = sourceImage.cloneNode(false) as HTMLImageElement
     let isClosing = false
     let closeTimer = 0
     let shouldBlurCover = false

     lightboxImage.className = 'feed-cover-lightbox-image'
     lightboxImage.removeAttribute('loading')
     setCoverLightboxImageRect(lightboxImage, startRect)

     const cleanup = () => {
          window.clearTimeout(closeTimer)
          window.removeEventListener('keydown', handleKeyDown)
          overlay.remove()
          cover.classList.remove('feed-detail-cover-lightbox-source')
          cover.setAttribute('aria-expanded', 'false')
          if (shouldBlurCover) cover.blur()
          if (activeCoverLightboxClose === close) activeCoverLightboxClose = null
     }

     const close = (blurCover = false) => {
          if (isClosing) return
          isClosing = true
          shouldBlurCover = blurCover
          if (blurCover) cover.blur()

          const returnRect = toCoverLightboxRect(cover.getBoundingClientRect())

          overlay.classList.remove('feed-cover-lightbox-open')
          setCoverLightboxImageRect(lightboxImage, returnRect)
          closeTimer = window.setTimeout(cleanup, coverLightboxTransitionMs)
     }

     function handleKeyDown(event: KeyboardEvent) {
          if (event.key === 'Escape') close(true)
     }

     overlay.addEventListener('click', () => close())
     window.addEventListener('keydown', handleKeyDown)

     overlay.append(backdrop, lightboxImage)
     document.body.append(overlay)
     cover.classList.add('feed-detail-cover-lightbox-source')
     cover.setAttribute('aria-expanded', 'true')
     activeCoverLightboxClose = close

     window.requestAnimationFrame(() => {
          overlay.classList.add('feed-cover-lightbox-open')
          setCoverLightboxImageRect(lightboxImage, targetRect)
     })
}

const bindDetailCoverLightbox = (cover: HTMLElement) => {
     if (!cover.querySelector('.feed-cover-image')) return

     cover.setAttribute('role', 'button')
     cover.setAttribute('tabindex', '0')
     cover.setAttribute('aria-label', 'Открыть обложку')
     cover.setAttribute('aria-expanded', 'false')
     cover.addEventListener('click', () => {
          openCoverLightbox(cover)
     })
     cover.addEventListener('keydown', (event) => {
          if (event.key !== 'Enter' && event.key !== ' ') return

          event.preventDefault()
          openCoverLightbox(cover)
     })
}

const applyCoverImageRatio = (
     cover: HTMLElement,
     image: HTMLImageElement
) => {
     const { naturalWidth, naturalHeight } = image

     if (naturalWidth > 0 && naturalHeight > 0) {
          cover.style.setProperty(
               '--feed-cover-ratio',
               `${naturalWidth} / ${naturalHeight}`
          )
          cover.style.setProperty(
               '--feed-cover-ratio-value',
               `${naturalWidth / naturalHeight}`
          )
     }

     cover.classList.add('feed-cover-loaded')
}

const applyCoverAssetRatio = (
     cover: HTMLElement,
     post: PublicFeedPost
) => {
     const width = post.image?.width
     const height = post.image?.height

     if (
          typeof width !== 'number' ||
          typeof height !== 'number' ||
          !Number.isFinite(width) ||
          !Number.isFinite(height) ||
          width <= 0 ||
          height <= 0
     ) {
          return
     }

     cover.style.setProperty('--feed-cover-ratio', `${width} / ${height}`)
     cover.style.setProperty('--feed-cover-ratio-value', `${width / height}`)
}

const createCover = (post: PublicFeedPost): HTMLElement => {
     const cover = createElement('div', 'feed-cover')

     cover.append(createCoverPlaceholder())

     if (post.image) {
          const image = createElement('img', 'feed-cover-image')

          applyCoverAssetRatio(cover, post)
          image.alt = `${getDisplayArtist(post)} - ${getDisplayTitle(post)}`
          image.loading = 'lazy'
          image.addEventListener('load', () => {
               applyCoverImageRatio(cover, image)
          })
          image.addEventListener('error', () => {
               cover.classList.add('feed-cover-missing')
               image.remove()
          })
          image.src = post.image.url

          if (image.complete) applyCoverImageRatio(cover, image)

          cover.append(image)
     } else {
          cover.classList.add('feed-cover-missing')
     }

     return cover
}

const createTrackList = (post: PublicFeedPost): HTMLElement => {
     const list = createElement('ul', 'feed-post-tracks')

     if (post.tracks.length === 0) {
          const item = createElement('li', 'feed-post-track feed-text-subheading')
          item.textContent = getDisplayTitle(post)
          list.append(item)

          return list
     }

     post.tracks.forEach((track) => {
          const item = createElement('li', 'feed-post-track feed-text-subheading')
          const button = createElement(
               'button',
               'feed-post-track-button',
               getTrackTitle(post, track)
          )

          button.type = 'button'
          button.dataset.feedTrackKey = getTrackKey(post, track)
          button.setAttribute('aria-pressed', 'false')
          button.addEventListener('click', (event) => {
               event.preventDefault()
               event.stopPropagation()
               handleFeedCardPlay(post, track)
          })

          item.append(button)
          list.append(item)
     })

     return list
}

const createMeta = (post: PublicFeedPost): HTMLElement => {
     const meta = createElement('div', 'feed-post-footer')
     const city = normalizeText(post.city)

     if (city) {
          meta.append(createElement('div', 'feed-post-location feed-text-note', city))
     }

     return meta
}

const createTags = (
     post: PublicFeedPost,
     limit: number | null = MAX_VISIBLE_TAGS
): HTMLElement[] => {
     const tags: HTMLElement[] = []
     const sourceTags = limit === null ? post.tags : post.tags.slice(0, limit)

     sourceTags.forEach((tag) => {
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

const createDetailMetaItem = (className: string, text: string): HTMLElement | null => {
     const value = normalizeText(text)
     if (!value) return null

     return createElement('span', className, value)
}

const getExternalLinkLabel = (link: PublicFeedLink): string =>
     normalizeText(link.label) || link.type

const parseExternalUrl = (rawUrl: string): URL | null => {
     try {
          return new URL(rawUrl)
     } catch {
          return null
     }
}

const getNormalizedHostName = (url: URL): string =>
     url.hostname.toLowerCase().replace(/^www\./, '')

const isSovietwaveVkPostUrl = (rawUrl: string): boolean => {
     const url = parseExternalUrl(rawUrl)
     if (!url) return false

     const host = getNormalizedHostName(url)

     return (
          (host === 'vk.com' || host === 'vk.ru') &&
          /^\/wall-71116189_\d+\/?$/i.test(url.pathname)
     )
}

const isSovietwaveTelegramPostUrl = (rawUrl: string): boolean => {
     const url = parseExternalUrl(rawUrl)
     if (!url) return false

     const host = getNormalizedHostName(url)

     return (
          (host === 't.me' || host === 'telegram.me') &&
          /^\/sovietwave\/\d+\/?$/i.test(url.pathname)
     )
}

const isArtistExternalLink = (link: PublicFeedLink): boolean => {
     const url = normalizeText(link.url)

     return (
          link.type !== 'source' &&
          !isSovietwaveVkPostUrl(url) &&
          !isSovietwaveTelegramPostUrl(url)
     )
}

const createExternalLink = (link: PublicFeedLink): HTMLAnchorElement | null => {
     const url = normalizeText(link.url)
     if (!url) return null

     const anchor = createElement('a', 'feed-detail-link')
     const label = getExternalLinkLabel(link)
     const iconName = ICON_LINK_FILE_BY_TYPE[link.type]

     anchor.href = url
     anchor.target = '_blank'
     anchor.rel = 'noopener noreferrer'
     anchor.title = label
     anchor.setAttribute('aria-label', label)

     if (iconName) {
          const icon = createElement('img', 'feed-detail-link-icon')

          icon.src = `/assets/sprites/icons/${iconName}.svg`
          icon.alt = ''
          icon.loading = 'lazy'
          anchor.append(icon)
     } else {
          anchor.classList.add('feed-detail-link-text')
          anchor.textContent = label
     }

     return anchor
}

const createExternalLinks = (post: PublicFeedPost): HTMLElement | null => {
     const links = createElement('nav', 'feed-detail-links')
     const anchors = post.links
          .filter(isArtistExternalLink)
          .map(createExternalLink)
          .filter((link): link is HTMLAnchorElement => link !== null)

     if (anchors.length === 0) return null

     links.setAttribute('aria-label', 'Внешние ссылки')
     links.replaceChildren(...anchors)

     return links
}

const createDetailFooter = (post: PublicFeedPost): HTMLElement | null => {
     const footer = createElement('footer', 'feed-detail-footer')
     const meta = createElement('div', 'feed-detail-meta feed-text-note')
     const city = createDetailMetaItem('feed-detail-meta-item', post.city)
     const tags = createElement('div', 'feed-detail-tags feed-text-note')
     const links = createExternalLinks(post)

     if (city) meta.append(city)

     createTags(post, null).forEach((tag) => {
          tag.classList.add('feed-detail-tag')
          tags.append(tag)
     })

     if (meta.childNodes.length > 0) footer.append(meta)
     if (tags.childNodes.length > 0) footer.append(tags)
     if (links) footer.append(links)

     return footer.childNodes.length > 0 ? footer : null
}

const createDetailTrackList = (post: PublicFeedPost): HTMLElement => {
     const section = createElement('section', 'feed-detail-tracks-section')

     section.setAttribute('aria-label', 'Треки поста')

     if (post.tracks.length === 0) {
          section.append(
               createElement(
                    'p',
                    'feed-detail-empty-tracks feed-text-subheading',
                    'Треков нет'
               )
          )
          return section
     }

     const list = createElement('ol', 'feed-detail-tracks')

     post.tracks.forEach((track) => {
          const item = createElement('li', 'feed-detail-track-item')
          const button = createElement(
               'button',
               'feed-detail-track feed-text-subheading'
          )
          const title = createElement('span', 'feed-detail-track-title', getTrackTitle(post, track))
          const artist = getTrackArtist(post, track)

          button.type = 'button'
          button.dataset.feedTrackKey = getTrackKey(post, track)
          button.setAttribute('aria-pressed', 'false')
          button.append(title)

          if (
               post.tracks.length > 1 &&
               artist.toLowerCase() !== getDisplayArtist(post).toLowerCase()
          ) {
               button.append(createElement('span', 'feed-detail-track-artist', artist))
          }

          button.addEventListener('click', () => {
               handleFeedCardPlay(post, track)
          })

          item.append(button)
          list.append(item)
     })

     section.append(list)

     return section
}

const createPostDetail = (post: PublicFeedPost): HTMLElement => {
     const layout = createElement('section', 'feed-detail-view')
     const article = createElement('article', 'feed-detail')
     const cover = createCover(post)
     const content = createElement('div', 'feed-detail-content')
     const main = createElement('div', 'feed-detail-main')
     const artist = createElement(
          'h1',
          'feed-detail-artist feed-text-heading',
          getDisplayArtist(post)
     )
     const footer = createDetailFooter(post)

     cover.classList.add('feed-detail-cover')
     bindDetailCoverLightbox(cover)

     main.append(artist, createDetailTrackList(post))
     content.append(main)
     if (footer) content.append(footer)

     article.append(cover, content)
     layout.append(article)

     return layout
}

const createPostCard = (post: PublicFeedPost): HTMLElement => {
     const article = createElement('article', 'feed-post')
     const link = createElement('a', 'feed-post-open')
     const content = createElement('div', 'feed-post-content')
     const main = createElement('div', 'feed-post-main')
     const artist = createElement(
          'h2',
          'feed-post-artist feed-text-heading',
          getDisplayArtist(post)
     )
     const meta = createMeta(post)

     link.href = `/feed/${post.slug}`
     link.setAttribute('aria-label', `${getDisplayArtist(post)} - ${getDisplayTitle(post)}`)

     main.append(artist, createTrackList(post))
     content.append(main)
     const tags = createTags(post)
     if (tags.length > 0) {
          const tagsLine = createElement('div', 'feed-post-tags feed-text-note')

          tagsLine.replaceChildren(...tags)
          meta.append(tagsLine)
     }
     if (meta.childNodes.length > 0) content.append(meta)

     article.append(createCover(post), content, link)

     return article
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
     updateActiveTrackElements(feedPlayerGetState())
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

const renderFeedPostRoute = async (
     route: { slug: string },
     useHistoryBack: boolean
) => {
     const token = ++renderToken

     renderShell('Загрузка поста...', 'Получаем публикацию', [])

     try {
          const index = await loadPublicFeedIndex()

          if (token !== renderToken) return

          const post = index.posts.find((item) => item.slug === route.slug)

          if (!post) {
               document.title = `Пост не найден | ${SITE_TITLE}`
               renderShell('Пост не найден', route.slug, [createLink('/feed', 'К ленте')])
               return
          }

          document.title = `${getPostDocumentTitle(post)} | ${SITE_TITLE}`
          renderView([createPostDetail(post)], {
               showBackButton: true,
               useHistoryBack,
          })
          updateActiveTrackElements(feedPlayerGetState())
     } catch {
          if (token !== renderToken) return
          renderShell('Не удалось загрузить пост', 'Попробуйте обновить страницу', [
               createLink('/feed', 'Лента'),
               createLink('/radio', 'Радио'),
          ])
     }
}

export const renderFeedRoute = (route: AppRoute) => {
     const useHistoryBack = previousRouteKind === 'feedList'
     previousRouteKind = route.kind

     switch (route.kind) {
          case 'feedList':
               void renderFeedListRoute(route)
               return

          case 'feedPost':
               void renderFeedPostRoute(route, useHistoryBack)
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
