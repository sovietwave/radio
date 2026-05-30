import {
     init,
     switchCurrentBackground,
     toggleLinks,
     toggleAirPanel,
     hideLeftPanels,
     toggleNavi,
     initPWA,
     installPWA,
} from './core'
import { radioInit, radioToggle, radioStopPlayback } from './radio'
import { renderFeedRoute } from './feed'
import { initRouter, type AppRoute } from './router'
import { feedPlayerInit, feedPlayerStop } from './feedPlayer'

const siteTitle = 'Советская Волна #sovietwave'

const setHidden = (elementId: string, hidden: boolean) => {
     const element = document.getElementById(elementId)
     if (element) element.hidden = hidden
}

const getRouteSection = (route: AppRoute): string | null => {
     switch (route.kind) {
          case 'radio':
               return 'radio'
          case 'about':
               return 'about'
          case 'feedList':
          case 'feedSearch':
          case 'feedPost':
               return 'feed'
          case 'notFound':
               return null
     }
}

const updateTopNavigation = (route: AppRoute) => {
     const section = getRouteSection(route)

     if (section) {
          document.body.dataset.section = section
     } else {
          delete document.body.dataset.section
     }

     document
          .querySelectorAll<HTMLAnchorElement>('[data-top-section]')
          .forEach((link) => {
               if (link.dataset.topSection === section) {
                    link.setAttribute('aria-current', 'page')
               } else {
                    link.removeAttribute('aria-current')
               }
          })
}

const getRouteTitle = (route: AppRoute): string => {
     switch (route.kind) {
          case 'radio':
               return siteTitle
          case 'about':
               return `О нас | ${siteTitle}`
          case 'feedList':
               return route.page === 1
                    ? `Лента | ${siteTitle}`
                    : `Лента, страница ${route.page} | ${siteTitle}`
          case 'feedSearch':
               {
                    const title = route.query ? `Поиск: ${route.query}` : 'Поиск'

                    return route.page === 1
                         ? `${title} | ${siteTitle}`
                         : `${title}, страница ${route.page} | ${siteTitle}`
               }
          case 'feedPost':
               return `Пост ${route.slug} | ${siteTitle}`
          case 'notFound':
               return `Страница не найдена | ${siteTitle}`
     }
}

const renderRoute = (route: AppRoute) => {
     const isRadio = route.kind === 'radio'

     if (isRadio) feedPlayerStop()
     document.body.dataset.view = isRadio ? 'radio' : 'feed'
     updateTopNavigation(route)
     setHidden('radio-view', !isRadio)
     setHidden('feed-view', isRadio)
     document.title = getRouteTitle(route)
     renderFeedRoute(route)
}

const radioToggleFromUi = (channel?: string) => {
     feedPlayerStop()
     return radioToggle(channel)
}

// register external control functions for HTML
globalThis.radioToggle = radioToggleFromUi
globalThis.radioStop = radioStopPlayback
globalThis.switchCurrentBackground = switchCurrentBackground
globalThis.toggleLinks = toggleLinks
globalThis.toggleAirPanel = toggleAirPanel
globalThis.hideLeftPanels = hideLeftPanels
globalThis.toggleLinks = toggleLinks
globalThis.toggleNavi = toggleNavi
globalThis.installPWA = installPWA

$(() => {
     init()
     radioInit()
     feedPlayerInit()
     initPWA()
     initRouter(renderRoute)
})
