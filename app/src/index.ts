import {
     init,
     switchCurrentBackground,
     toggleLinks,
     toggleAirPanel,
     hideLeftPanels,
     toggleNavi,
} from './core'
import { radioInit, radioToggle } from './radio'

// register external control functions for HTML
globalThis.radioToggle = radioToggle
globalThis.switchCurrentBackground = switchCurrentBackground
globalThis.toggleLinks = toggleLinks
globalThis.toggleAirPanel = toggleAirPanel
globalThis.hideLeftPanels = hideLeftPanels
globalThis.toggleLinks = toggleLinks
globalThis.toggleNavi = toggleNavi

// Register service worker
if ('serviceWorker' in navigator) {
     window.addEventListener('load', () => {
          navigator.serviceWorker
               .register('/service-worker.ts', {
                    type: 'module',
                    scope: '/',
               })
               .then((registration) => {
                    console.log('ServiceWorker registration successful')
               })
               .catch((err) => {
                    console.error('ServiceWorker registration failed:', err)
               })
     })
}

$(() => {
     init()
     radioInit()
})
