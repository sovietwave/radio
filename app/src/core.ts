import { rnd } from './common'

//let siteModeOverridden = true;
let currentIndex: number = 0
let frameIndex: number = 0
let framesCount: number = 3
let SITE_MODE: string = ''

const backs = {
     day: {
          backs: [
               '/assets/sprites/bg/day4.jpg',
               '/assets/sprites/bg/day8.jpg',
               '/assets/sprites/bg/day9.jpg',
          ],

          backs_mobile: [
               '/assets/sprites/bg/mobile/day4.jpg',
               '/assets/sprites/bg/mobile/day8.jpg',
               '/assets/sprites/bg/mobile/day9.jpg',
          ],
     },

     evening: {
          backs: [
               '/assets/sprites/bg/evening4.jpg',
               '/assets/sprites/bg/evening8.jpg',
               '/assets/sprites/bg/evening9.jpg',
          ],

          backs_mobile: [
               '/assets/sprites/bg/mobile/evening4.jpg',
               '/assets/sprites/bg/mobile/evening8.jpg',
               '/assets/sprites/bg/mobile/evening9.jpg',
          ],
     },

     night: {
          backs: [
               '/assets/sprites/bg/night4.jpg',
               '/assets/sprites/bg/night8.jpg',
               '/assets/sprites/bg/night9.jpg',
          ],

          backs_mobile: [
               '/assets/sprites/bg/mobile/night4.jpg',
               '/assets/sprites/bg/mobile/night8.jpg',
               '/assets/sprites/bg/mobile/night9.jpg',
          ],
     },

     midnight: {
          backs: [
               '/assets/sprites/bg/midnight2.jpg',
               '/assets/sprites/bg/midnight4.jpg',
               '/assets/sprites/bg/midnight6.jpg',
          ],

          backs_mobile: [
               '/assets/sprites/bg/mobile/midnight2.jpg',
               '/assets/sprites/bg/mobile/midnight4.jpg',
               '/assets/sprites/bg/mobile/midnight6.jpg',
          ],
     },

     event: {
          backs: [
               '/assets/sprites/bg/event_diskette/1.jpg',
               '/assets/sprites/bg/event_diskette/2.jpg',
          ],

          backs_mobile: [
               '/assets/sprites/bg/event_diskette/1.jpg',
               '/assets/sprites/bg/event_diskette/2.jpg',
          ],
     },

     stream: {
          backs: [
               '/stream/day.jpg',
               '/stream/evening.jpg',
               '/stream/midnight.jpg',
               '/stream/night.jpg',
          ],
     },
}

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

     event: {
          title: 'Вечер в Дискете',
          subtitle: '#sovietwave',
          times: '28 ноября',
     },

     event_space: {
          title: 'День Космонавтики',
          subtitle: '#sovietwave',
          start: '12 апреля',
          finish: '14 апреля',
          times: '12—18 апреля',
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
let streamOverride = false
let portraitOrientation
let animDurationFaster = 100
let animDurationFast = 250
let animDurationLong = 600
let switchedToMicro = false

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

export const init = () => {
     SITE_MODE = getUrlSearchParam('mode') || ''

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

     if (SITE_MODE == 'stream') {
          streamOverride = true
          console.log('streamOverride')
     }

     /* SITE_MODE = "event"; */

     if (SITE_MODE == '') {
          SITE_MODE = getCurrentMode()
     }

     currentIndex = -1
     console.log('SITE_MODE: ' + SITE_MODE)
     currentIndex = rnd(backs[SITE_MODE].backs.length) // Randomize fist pic
     frameIndex = rnd(framesCount) + 1

     setTheme(SITE_MODE)
}

const setTheme = (mode: string) => {
     if (modes[mode]) {
          const modeContent = modes[mode]

          $('#air-title').text(modeContent['title'])
          $('#air-tags').text(modeContent['subtitle'])
          $('#air-start-time').text(modeContent['start'])
          $('#air-end-time').text(modeContent['finish'])
          $('#air-times').text(modeContent['times'])
     }

     switchBackground(mode)
}

const switchBackground = (mode: string) => {
     if (mode != SITE_MODE) {
          console.log(
               'Backgrounds can be changed only for current (' +
                    SITE_MODE +
                    ') site mode'
          )
          return
     }

     if (streamOverride) {
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

     const currentModeAssets = backs[SITE_MODE]
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
     switchBackground(SITE_MODE)

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

     if (portraitOrientation) return

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
     if (!linksIsEnabled && !airIsEnabled) {
          return
     }

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
