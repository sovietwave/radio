import { rnd } from './common'
import { backgroundAssetsByMode as backs } from './backgrounds'
import { radioStop } from './radio'

let currentIndex: number = 0
let frameIndex: number = 0
let framesCount: number = 3
let SITE_MODE: string = ''
let SITE_BG_MODE: string = ''
let OVERRIDE_MODE: string = ''
let OVERRIDE_BG: string | null = null

const modes = {
     day: {
          title: 'Дневной эфир',
          subtitle: '#chillwave #dreamwave #sovietwave',
          start: '7:00',
          finish: '19:00',
          times: '7:00 — 19:00 МСК',
     },

     evening: {
          title: 'Вечерний эфир',
          subtitle: '#synthpop #postpunk #sovietwave',
          start: '19:00',
          finish: '0:00',
          times: '19:00 — 0:00 МСК',
     },

     night: {
          title: 'Ночной эфир',
          subtitle: '#ambient #experimental #sovietwave',
          start: '0:00',
          finish: '7:00',
          times: '1:00 — 7:00 МСК',
     },

     midnight: {
          title: 'Полуночный эфир',
          subtitle: '#etherial #ambientpop #sovietwave',
          start: '0:00',
          finish: '7:00',
          times: '0:00 — 1:00 МСК',
     },

     event_diskette: {
          title: 'Вечер в Дискете',
          subtitle: '#sovietwave',
          times: '28 ноября',
     },

     event: {
          title: 'День Космонавтики',
          subtitle: '#sovietwave',
          start: '12 апреля',
          finish: '12 апреля',
          times: '12 апреля',
     },

     event2_ssw: {
          title: 'Советская советская волна',
          subtitle: '#psychedelic #retro',
          start: '20 ноября',
          finish: '21 ноября',
          times: '20—21 ноября',
     },

     event3_chillwave: {
          title: '#chillwave',
          subtitle: '#glofi #hypnagogic #dreamwave',
          start: '1 декабря',
          finish: '2 декабря',
          times: '1—2 декабря',
     },
}

let naviIsEnabled = true
let airIsEnabled = false
let linksIsEnabled = false
let brightIsEnabled = false
let links
let air
let bright
let navi
let logo
let activeLinks
let activeAir
let frameOverlay
let sfxSlide
let sfxSlide2
let sfxClick
let sfxClick2
let sfxCamera
let sfxCamera2
let sfxCounter
let coverImage
let frameMobileMode = false
let player
let portraitOrientation
let animDurationFaster = 100
let animDurationFast = 250
let animDurationLong = 600
let switchedToMicro = false
let deferredPrompt: any = null

export let state = {
     volumeValue: 1,
}

const isMobileMode = (): boolean => {
     if (
          document.documentElement.scrollWidth <= 800 ||
          document.documentElement.scrollHeight <= 500
     )
          return true
     return false
}

const isXSMode = () => {
     if (
          document.documentElement.scrollWidth <= 300 ||
          document.documentElement.scrollHeight <= 400
     )
          return true
     return false
}

const getCurrentMode = (): string => {
     const d = new Date()
     const nd = new Date(d.getTime() + 10800000) // 3600000 * 3 (3 - MSK, UTC+3)
     const t = nd.getUTCHours()

     if (t >= 1 && t < 7) {
          return 'night'
     }

     if (t >= 7 && t < 19) {
          return 'day'
     }

     if (t >= 0 && t < 1) {
          return 'midnight'
     }

     return 'evening'
}

const getUrlSearchParam = (key: string): string | null => {
     try {
          return new URLSearchParams(location.search).get(key)
     } catch {
          // the latest iOS WKWebView (2024) could be blocked by privacy and fails to read query params
     }
     return null
}

const getBackgroundMode = (mode: string): string => {
     const requestedModeAssets = backs[mode]

     if (requestedModeAssets && requestedModeAssets.backs.length > 0) {
          return mode
     }

     if (backs.full && backs.full.backs.length > 0) {
          return 'full'
     }

     return mode
}

export const init = () => {
     window.addEventListener('resize', () => {
          onResize()
     })
     portraitOrientation = isMobileMode()

     links = $('#panel')
     air = $('#air-panel')
     bright = $('#bright-overlay')
     navi = $('#navi')
     logo = $('#navi-logo')
     activeLinks = $('#panel-active-links')
     activeAir = $('#panel-active-air')
     frameOverlay = $('#frame-overlay')
     coverImage = $('#cover-image')
     player = $('#player-wrapper')

     sfxSlide = new Audio('/assets/sfx/slide.mp3')
     sfxClick = new Audio('/assets/sfx/click.mp3')
     sfxCamera = new Audio('/assets/sfx/camera.mp3')

     sfxSlide2 = new Audio('/assets/sfx/slide.mp3')
     sfxClick2 = new Audio('/assets/sfx/click.mp3')
     sfxCamera2 = new Audio('/assets/sfx/camera.mp3')
     sfxCounter = 0

     frameIndex = rnd(framesCount) + 1

     OVERRIDE_MODE = getUrlSearchParam('mode') || ''
     const bgParam = getUrlSearchParam('bg')
     if (bgParam && !bgParam.includes('..')) {
          let value = bgParam
          if (value.endsWith('.jpg')) {
               value = value.substring(0, value.length - 4)
          }
          OVERRIDE_BG = value
     }
     //OVERRIDE_MODE = 'event';

     if (OVERRIDE_MODE == 'stream') {
          console.log('streamOverride')
     }

     requestThemeMode()
}

function setTheme() {
     let mode = OVERRIDE_MODE
     if (mode == '') mode = getCurrentMode()

     const backgroundMode = getBackgroundMode(mode)
     const backgroundAssets = backs[backgroundMode]

     if (!backgroundAssets || backgroundAssets.backs.length == 0) return
     if (SITE_MODE == mode && SITE_BG_MODE == backgroundMode) return

     SITE_MODE = mode
     SITE_BG_MODE = backgroundMode
     console.log('SITE_MODE: ' + SITE_MODE)

     if (modes[mode]) {
          const modeContent = modes[mode]

          $('#air-title').text(modeContent['title'])
          $('#air-tags').text(modeContent['subtitle'])
          $('#air-start-time').text(modeContent['start'])
          $('#air-end-time').text(modeContent['finish'])
          $('#air-times').text(modeContent['times'])
     }

     currentIndex = rnd(backgroundAssets.backs.length) // Randomize fist pic
     switchBackground(backgroundMode)
}

function requestThemeMode() {
     setTimeout(requestThemeMode, 10000)
     setTheme()
}

function switchBackground(mode) {
     if (OVERRIDE_BG) {
          coverImage.css({
               'background-image':
                    'url(/assets/sprites/bg/' + OVERRIDE_BG + '.jpg)',
          })
          switchFrame()
          return
     }
     if (OVERRIDE_MODE == 'stream') {
          let bg = 0
          console.log(backs['stream'].backs[0])
          if (mode == 'evening') bg = 1
          else if (mode == 'midnight') bg = 2
          else if (mode == 'night') bg = 3

          coverImage.css({
               'background-image': 'url(' + backs['stream'].backs[bg] + ')',
          })
          return
     }

     const currentModeAssets = backs[mode]
     if (!currentModeAssets || currentModeAssets.backs.length == 0) return
     const backsCount = currentModeAssets.backs.length
     let nextIndex = 0

     currentIndex++

     if (currentIndex > backsCount - 1) currentIndex = 0

     nextIndex = currentIndex + 1
     if (nextIndex > backsCount - 1) {
          nextIndex = 0
     }

     if (portraitOrientation)
          coverImage.css({
               'background-image': `url(${currentModeAssets.backs_mobile[currentIndex]})`,
          })
     else
          coverImage.css({
               'background-image': `url(${currentModeAssets.backs[currentIndex]})`,
          })

     switchFrame()
}

const onResize = () => {
     let nowIsMobile = isMobileMode()
     let nowIsMicro = isXSMode()

     if (nowIsMobile != portraitOrientation) {
          portraitOrientation = nowIsMobile
          switchFrame()
     }

     if (nowIsMicro && !switchedToMicro) {
          switchedToMicro = true
          disableBright()
          disableAir()
          disableLinks()
     }
}

const switchFrame = () => {
     frameIndex++
     if (frameIndex > framesCount) frameIndex = 1

     let frameMobileMode =
          document.documentElement.scrollWidth <
          document.documentElement.scrollHeight

     if (!portraitOrientation)
          frameOverlay.css({
               'background-image':
                    'url(/assets/sprites/frame' + frameIndex + '.png)',
          })
     else
          frameOverlay.css({
               'background-image':
                    'url(/assets/sprites/frame' + frameIndex + 'm.png)',
          })
}

export const switchCurrentBackground = () => {
     sfxPlayCamera()
     switchBackground(SITE_BG_MODE || SITE_MODE)

     if (portraitOrientation) hideLeftPanels()
}

const toggleFrame = () => {
     if (!portraitOrientation && (linksIsEnabled || airIsEnabled))
          frameOverlay.animate(
               {
                    left: '-30px',
                    right: '-30px',
                    top: '-30px',
               },
               animDurationLong
          )
     else
          frameOverlay.animate(
               {
                    left: '0px',
                    right: '0px',
                    top: '0px',
               },
               400
          )
}

export const toggleLinks = () => {
     if (linksIsEnabled) {
          disableLinks()
          sfxPlaySlide()
     } else {
          enableLinks()
          sfxPlayClick()
     }

     closePopup()
     toggleFrame()
}

const enableLinks = () => {
     if (linksIsEnabled) {
          return
     }

     linksIsEnabled = true

     togglePlayer() //for mobile

     enableBright()
     disableAir()

     links.show()
     links.animate(
          {
               left: '0',
               top: '0',
               opacity: '1',
          },
          animDurationFast
     )

     activeLinks.show()
     activeLinks.animate(
          {
               opacity: '1',
          },
          animDurationFast
     )
}

const disableLinks = () => {
     if (!linksIsEnabled) return
     linksIsEnabled = false

     togglePlayer() //for mobile

     if (!airIsEnabled) disableBright()

     activeLinks.animate(
          {
               opacity: '0',
          },
          animDurationFast,
          function () {
               activeLinks.hide()
          }
     )

     if (!portraitOrientation) {
          links.animate(
               {
                    left: '-150',
                    opacity: '0',
               },
               animDurationFast,
               function () {
                    links.hide()
               }
          )
     } else {
          links.animate(
               {
                    top: '-100',
                    opacity: '0',
               },
               animDurationFast,
               function () {
                    links.hide()
               }
          )
     }
}

export const toggleAirPanel = () => {
     if (airIsEnabled) {
          disableAir()
          sfxPlaySlide()
     } else {
          enableAir()
          sfxPlayClick()
     }

     toggleFrame()
}

const enableAir = () => {
     if (airIsEnabled) return
     airIsEnabled = true

     togglePlayer() //for mobile

     enableBright()
     disableLinks()

     air.show()
     air.animate(
          {
               left: '0',
               top: '0',
               opacity: '1',
          },
          animDurationFast
     )

     activeAir.show()
     activeAir.animate(
          {
               opacity: '1',
          },
          animDurationFast
     )
}

const disableAir = () => {
     if (!airIsEnabled) return
     airIsEnabled = false

     togglePlayer() //for mobile

     if (!linksIsEnabled) disableBright()

     if (!portraitOrientation) {
          air.animate(
               {
                    left: '-150',
                    opacity: '0',
               },
               animDurationFast,
               function () {
                    air.hide()
               }
          )
     } else {
          air.animate(
               {
                    top: '-100',
                    opacity: '0',
               },
               animDurationFast,
               function () {
                    air.hide()
               }
          )
     }

     activeAir.animate(
          {
               opacity: '0',
          },
          animDurationFast,
          function () {
               activeAir.hide()
          }
     )
}

const toggleBright = () => {
     if (brightIsEnabled) {
          disableBright()
     } else {
          enableBright()
     }
}

const enableBright = () => {
     if (brightIsEnabled) {
          return
     }
     brightIsEnabled = true

     //  if (portraitOrientation) return

     bright.show()
     bright.animate(
          {
               opacity: '0.2',
          },
          animDurationFast
     )
}

const disableBright = () => {
     if (!brightIsEnabled) {
          return
     }
     brightIsEnabled = false

     bright.animate(
          {
               opacity: '0',
          },
          animDurationFast,
          function () {
               bright.hide()
          }
     )
}

export const hideLeftPanels = () => {
     /*

	if (!linksIsEnabled && !airIsEnabled) {
		return;
	}*/
     closePopup()

     disableBright()
     disableAir()
     disableLinks()

     sfxPlaySlide()
     toggleFrame()
}

const sfxPlayClick = () => {
     sfxCounter++
     if (sfxCounter == 1) sfxClick.play()
     else {
          sfxClick2.play()
          sfxCounter = 0
     }
}

const sfxPlaySlide = () => {
     sfxCounter++
     if (sfxCounter == 1) sfxSlide.play()
     else {
          sfxSlide2.play()
          sfxCounter = 0
     }
}

const sfxPlayCamera = () => {
     sfxCounter++
     if (sfxCounter == 1) sfxCamera.play()
     else {
          sfxCamera2.play()
          sfxCounter = 0
     }
}

export const toggleNavi = () => {
     disableBright()
     disableAir()
     disableLinks()
     closePopup()

     togglePlayer() //for mobile

     naviIsEnabled = !naviIsEnabled

     if (!naviIsEnabled) {
          sfxPlaySlide()

          navi.animate(
               {
                    opacity: '0',
                    bottom: '-170px',
               },
               animDurationLong
          )

          frameOverlay.animate(
               {
                    opacity: '0',
                    left: '-100px',
                    right: '-100px',
                    top: '-100px',
                    bottom: '-100px',
               },
               animDurationLong
          )

          coverImage.animate(
               {
                    left: '0px',
                    right: '0px',
                    top: '0px',
                    bottom: '0px',
               },
               animDurationLong
          )

          logo.animate(
               {
                    bottom: '20px',
               },
               animDurationFaster
          )

          logo.find('img').animate(
               {
                    height: '70px',
               },
               animDurationLong
          )

          //coverImage.animate({'background-size': 'cover 100%'}, durationHide);
     } else {
          sfxPlayClick()
          switchFrame()

          navi.animate(
               {
                    opacity: '1',
                    bottom: '0px',
               },
               animDurationFast
          )

          frameOverlay.animate(
               {
                    opacity: '1',
                    left: '0px',
                    right: '0px',
                    top: '0px',
                    bottom: '69px',
               },
               animDurationFast
          )

          coverImage.animate(
               {
                    left: '-30px',
                    right: '-30px',
                    top: '-30px',
                    bottom: '-30px',
               },
               animDurationFast
          )

          logo.animate(
               {
                    bottom: '5px',
               },
               animDurationFaster
          )

          logo.find('img').animate(
               {
                    height: '60px',
               },
               animDurationFast
          )

          //coverImage.animate({'background-size': 'cover 105%'}, durationShow);
     }
}

const togglePlayer = () => {
     if (portraitOrientation) {
          if (linksIsEnabled || airIsEnabled) {
               player.hide()
          } else {
               player.show()
          }
     } else {
          player.show()
     }
}

export const initPWA = () => {
     const isMobileOS = 'ontouchstart' in window && navigator.maxTouchPoints > 0

     $('#pwa-install-button').hide()

     if (
          !('BeforeInstallPromptEvent' in window) ||
          window.matchMedia('(display-mode: standalone)').matches
     ) {
          $('#pwa-install-button').hide()
          return
     }
     window.addEventListener('beforeinstallprompt', (e) => {
          e.preventDefault()
          deferredPrompt = e

          $('#pwa-install-button').show()

          if (deferredPrompt && localStorage.pwaInstalled === 'true') {
               localStorage.removeItem('pwaInstalled')
          }
     })
     window.addEventListener('appinstalled', () => {
          $('#pwa-install-button').hide()
          deferredPrompt = null
          !isMobileOS && localStorage.setItem('pwaInstalled', 'true')
     })
}

export const installPWA = async () => {
     if (localStorage.pwaInstalled === 'true') {
          alert(
               'Приложение уже установлено\n\nДля запуска найдите ярлык на рабочем столе или в установленных программах'
          )
          return
     }
     deferredPrompt.prompt()
     const { outcome } = await deferredPrompt.userChoice
     if (outcome === 'accepted') {
          deferredPrompt = null
          $('#pwa-install-button').hide()
     }
}

let popupTimeout

export function showPopup() {
     toggleBright()
     sfxClick.play()
     //radioStop();

     clearTimeout(popupTimeout)
     const popup = document.getElementById('popup')
     popup.style.display = 'flex'
     setTimeout(() => {
          popup.classList.add('show')
     }, 10)
}

;(window as any).showPopup = showPopup

export function closePopup() {
     const popup = document.getElementById('popup')
     popup.classList.remove('show')
     popupTimeout = setTimeout(() => {
          popup.style.display = 'none'
     }, 400)
}
