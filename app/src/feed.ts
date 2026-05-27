import type { AppRoute } from './router'

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

const renderShell = (
     title: string,
     summary: string,
     actions: HTMLAnchorElement[]
) => {
     const root = document.getElementById('feed-view')
     if (!root) return

     const routeView = createElement('article', 'feed-route')
     const heading = createElement('h1', 'feed-title', title)
     const summaryElement = createElement('p', 'feed-summary', summary)
     const actionsElement = createElement('nav', 'feed-actions')

     actionsElement.setAttribute('aria-label', 'Навигация раздела')
     actionsElement.replaceChildren(...actions)
     routeView.replaceChildren(heading, summaryElement, actionsElement)
     root.replaceChildren(routeView)
}

export const renderFeedRoute = (route: AppRoute) => {
     switch (route.kind) {
          case 'feedList':
               renderShell('Лента', `Страница ${route.page}`, [
                    createLink('/radio', 'Радио'),
               ])
               return

          case 'feedPost':
               renderShell(`Пост ${route.slug}`, route.slug, [
                    createLink('/feed', 'Лента'),
               ])
               return

          case 'notFound':
               renderShell('Страница не найдена', route.path, [
                    createLink('/radio', 'Радио'),
                    createLink('/feed', 'Лента'),
               ])
               return

          case 'radio':
               document.getElementById('feed-view')?.replaceChildren()
               return
     }
}
