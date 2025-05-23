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
import { radioInit, radioToggle, radioStop } from './radio'

// register external control functions for HTML
globalThis.radioToggle = radioToggle
globalThis.radioStop = radioStop
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
     initPWA()
})
