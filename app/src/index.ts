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
import { radioInit, radioToggle, radioStop, changeStream } from './radio'

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
globalThis.changeStream = changeStream

$(() => {
     init()
     radioInit()
     initPWA()
})
