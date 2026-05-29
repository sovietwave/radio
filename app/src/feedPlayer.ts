import type { PublicFeedPost, PublicFeedTrack } from './feedTypes'
import { radioGetVolume, radioStopPlayback } from './radio'

export type FeedPlayerStatus = 'idle' | 'loading' | 'playing' | 'paused' | 'error'

export interface FeedPlayerState {
     status: FeedPlayerStatus
     post: PublicFeedPost | null
     track: PublicFeedTrack | null
     trackIndex: number
     currentTime: number
     duration: number | null
     error: string | null
}

const stateChangeEventName = 'feed-player:state-change'
const volumeChangeEventName = 'swr:volume-change'
const missingMediaError =
     'Mp3 не найден: проверьте PUBLIC_FEED_MEDIA_ROOT или серверный /feed/media'

let feedAudio: HTMLAudioElement | null = null
let isInitialized = false
let activeRequestId = 0
let activeAudioUrl = ''

let state: FeedPlayerState = {
     status: 'idle',
     post: null,
     track: null,
     trackIndex: -1,
     currentTime: 0,
     duration: null,
     error: null,
}

const getTrackTitle = (post: PublicFeedPost, track: PublicFeedTrack): string =>
     track.title.trim() || post.title.trim() || 'Без названия'

const getTrackArtist = (post: PublicFeedPost, track: PublicFeedTrack): string =>
     track.artist.trim() || post.artist.trim() || 'Советская Волна'

const getDuration = (): number | null => {
     if (!feedAudio || !Number.isFinite(feedAudio.duration)) return state.duration
     return feedAudio.duration
}

const formatTime = (seconds: number | null): string => {
     if (seconds === null || !Number.isFinite(seconds)) return '0:00'

     const normalizedSeconds = Math.max(0, Math.floor(seconds))
     const minutes = Math.floor(normalizedSeconds / 60)
     const rest = normalizedSeconds % 60

     return `${minutes}:${rest.toString().padStart(2, '0')}`
}

const cloneState = (): FeedPlayerState => ({ ...state })

const dispatchStateChange = () => {
     renderPlayerBar()
     window.dispatchEvent(
          new CustomEvent<FeedPlayerState>(stateChangeEventName, {
               detail: cloneState(),
          })
     )
}

const getElement = <T extends HTMLElement>(id: string): T | null =>
     document.getElementById(id) as T | null

const setButtonState = (
     id: string,
     disabled: boolean,
     label?: string
) => {
     const button = getElement<HTMLButtonElement>(id)
     if (!button) return

     button.disabled = disabled
     if (label) button.setAttribute('aria-label', label)
}

const renderPlayerBar = () => {
     const artistElement = getElement('feed-player-artist')
     const titleElement = getElement('feed-player-title')
     const errorElement = getElement('feed-player-error')
     const toggleButton = getElement<HTMLButtonElement>('feed-player-toggle')
     const progress = getElement<HTMLInputElement>('feed-player-progress')
     const timeElement = getElement('feed-player-time')

     const hasTrack = Boolean(state.post && state.track)
     const duration = state.duration ?? 0
     const isPlayable = hasTrack && state.status !== 'error'

     if (artistElement) {
          artistElement.textContent =
               state.post && state.track
                    ? getTrackArtist(state.post, state.track)
                    : ''
     }

     if (titleElement) {
          if (state.post && state.track) {
               titleElement.textContent = getTrackTitle(state.post, state.track)
          } else {
               titleElement.textContent = ''
          }
     }

     if (errorElement) {
          errorElement.textContent = state.error ?? ''
          errorElement.hidden = state.status !== 'error'
     }

     if (toggleButton) {
          toggleButton.disabled = !isPlayable
          toggleButton.dataset.status = state.status
          toggleButton.setAttribute(
               'aria-label',
               state.status === 'playing' ? 'Пауза' : 'Воспроизвести'
          )
     }

     setButtonState('feed-player-prev', !hasTrack || state.trackIndex <= 0)
     setButtonState(
          'feed-player-next',
          !hasTrack ||
               !state.post ||
               state.trackIndex < 0 ||
               state.trackIndex >= state.post.tracks.length - 1
     )

     if (progress) {
          progress.disabled = !hasTrack || duration <= 0
          progress.max = `${Math.max(0, duration)}`
          progress.value = `${Math.min(state.currentTime, Math.max(0, duration))}`
     }

     if (timeElement) {
          timeElement.textContent = `${formatTime(state.currentTime)} / ${formatTime(
               state.duration
          )}`
     }
}

const setState = (nextState: Partial<FeedPlayerState>) => {
     state = { ...state, ...nextState }
     dispatchStateChange()
}

const setStateForRequest = (
     requestId: number,
     nextState: Partial<FeedPlayerState>
) => {
     if (requestId !== activeRequestId) return
     setState(nextState)
}

const setAudioVolume = (volume: number) => {
     if (!feedAudio) return
     feedAudio.volume = Math.min(1, Math.max(0, volume))
}

const getAbsoluteAudioUrl = (audioUrl: string): string => {
     try {
          return new URL(audioUrl, window.location.href).href
     } catch {
          return audioUrl
     }
}

const isSameOriginFeedMediaUrl = (audioUrl: string): boolean => {
     try {
          const url = new URL(audioUrl, window.location.href)

          return (
               url.origin === window.location.origin &&
               url.pathname.startsWith('/feed/media/')
          )
     } catch {
          return false
     }
}

const assertPlayableFeedMedia = async (audioUrl: string) => {
     if (!isSameOriginFeedMediaUrl(audioUrl)) return

     const response = await fetch(audioUrl, {
          method: 'HEAD',
          cache: 'no-store',
     })
     const contentType = response.headers.get('content-type')?.toLowerCase() ?? ''

     if (!response.ok || contentType.includes('text/html')) {
          throw new Error(missingMediaError)
     }
}

const isActiveAudioElementSource = () => {
     if (!feedAudio || !activeAudioUrl) return true

     return feedAudio.currentSrc === activeAudioUrl || feedAudio.src === activeAudioUrl
}

export const feedPlayerGetState = (): FeedPlayerState => cloneState()

export const feedPlayerPlayTrack = (
     post: PublicFeedPost,
     trackId: string
) => {
     const trackIndex = post.tracks.findIndex((track) => track.id === trackId)
     const track = post.tracks[trackIndex]

     if (!feedAudio || trackIndex < 0 || !track) return

     const requestId = activeRequestId + 1
     const audioUrl = getAbsoluteAudioUrl(track.audioUrl)

     activeRequestId = requestId
     activeAudioUrl = ''
     setState({
          status: 'loading',
          post,
          track,
          trackIndex,
          currentTime: 0,
          duration: track.duration,
          error: null,
     })

     void assertPlayableFeedMedia(track.audioUrl)
          .then(() => {
               if (!feedAudio || requestId !== activeRequestId) return

               radioStopPlayback()

               activeAudioUrl = audioUrl
               feedAudio.pause()
               feedAudio.src = audioUrl
               feedAudio.currentTime = 0
               feedAudio.title = `${getTrackArtist(post, track)} - ${getTrackTitle(
                    post,
                    track
               )}`
               setAudioVolume(radioGetVolume())

               void feedAudio.play().catch(() => {
                    setStateForRequest(requestId, {
                         status: 'error',
                         error: 'Не удалось воспроизвести трек',
                    })
               })
          })
          .catch((error) => {
               const message = error instanceof Error ? error.message : missingMediaError

               setStateForRequest(requestId, {
                    status: 'error',
                    error: message,
               })
          })
}

export const feedPlayerToggle = () => {
     if (!feedAudio || !state.track || !state.post) return

     if (state.status === 'playing' || state.status === 'loading') {
          feedAudio.pause()
          return
     }

     if (state.status === 'error') {
          feedPlayerPlayTrack(state.post, state.track.id)
          return
     }

     void feedAudio.play().catch(() => {
          setState({
               status: 'error',
               error: 'Не удалось воспроизвести трек',
          })
     })
}

export const feedPlayerPrev = () => {
     if (!state.post || state.trackIndex < 0) return

     if (state.trackIndex === 0) {
          if (feedAudio) feedAudio.currentTime = 0
          setState({ currentTime: 0 })
          return
     }

     const previousTrack = state.post.tracks[state.trackIndex - 1]
     if (previousTrack) feedPlayerPlayTrack(state.post, previousTrack.id)
}

export const feedPlayerNext = () => {
     if (!state.post || state.trackIndex < 0) return

     const nextTrack = state.post.tracks[state.trackIndex + 1]
     if (nextTrack) feedPlayerPlayTrack(state.post, nextTrack.id)
}

export const feedPlayerStop = () => {
     activeRequestId += 1
     activeAudioUrl = ''

     if (feedAudio) {
          feedAudio.pause()
          feedAudio.removeAttribute('src')
          feedAudio.load()
     }

     setState({
          status: 'idle',
          post: null,
          track: null,
          trackIndex: -1,
          currentTime: 0,
          duration: null,
          error: null,
     })
}

const onFeedPlayTrackRequest = (event: Event) => {
     const { post, track } = (event as CustomEvent<{
          post: PublicFeedPost
          track: PublicFeedTrack
     }>).detail

     if (!post || !track) return
     feedPlayerPlayTrack(post, track.id)
}

const bindDomControls = () => {
     getElement<HTMLButtonElement>('feed-player-prev')?.addEventListener(
          'click',
          feedPlayerPrev
     )
     getElement<HTMLButtonElement>('feed-player-toggle')?.addEventListener(
          'click',
          feedPlayerToggle
     )
     getElement<HTMLButtonElement>('feed-player-next')?.addEventListener(
          'click',
          feedPlayerNext
     )

     getElement<HTMLInputElement>('feed-player-progress')?.addEventListener(
          'input',
          (event) => {
               if (!feedAudio) return
               const value = Number((event.target as HTMLInputElement).value)
               if (!Number.isFinite(value)) return

               feedAudio.currentTime = value
               setState({ currentTime: value })
          }
     )
}

const bindAudioEvents = () => {
     if (!feedAudio) return

     feedAudio.addEventListener('play', () => {
          if (!isActiveAudioElementSource()) return
          setState({ status: 'playing', error: null })
     })
     feedAudio.addEventListener('pause', () => {
          if (!isActiveAudioElementSource()) return
          if (state.status === 'idle' || state.status === 'error') return
          setState({ status: 'paused' })
     })
     feedAudio.addEventListener('loadedmetadata', () => {
          if (!isActiveAudioElementSource()) return
          setState({ duration: getDuration() })
     })
     feedAudio.addEventListener('timeupdate', () => {
          if (!isActiveAudioElementSource()) return
          setState({
               currentTime: feedAudio?.currentTime ?? 0,
               duration: getDuration(),
          })
     })
     feedAudio.addEventListener('ended', () => {
          if (!isActiveAudioElementSource()) return
          if (state.post && state.trackIndex < state.post.tracks.length - 1) {
               feedPlayerNext()
               return
          }

          setState({
               status: 'paused',
               currentTime: state.duration ?? feedAudio?.currentTime ?? 0,
          })
     })
     feedAudio.addEventListener('error', () => {
          if (!isActiveAudioElementSource()) return
          if (state.status === 'idle') return
          setState({
               status: 'error',
               error: 'Ошибка загрузки mp3',
          })
     })
}

export const feedPlayerInit = () => {
     if (isInitialized) return

     feedAudio = document.createElement('audio')
     feedAudio.preload = 'metadata'
     feedAudio.setAttribute('playsinline', 'true')
     feedAudio.setAttribute('webkit-playsinline', 'true')
     setAudioVolume(radioGetVolume())

     bindAudioEvents()
     bindDomControls()
     window.addEventListener('feed:play-track-request', onFeedPlayTrackRequest)
     window.addEventListener(volumeChangeEventName, (event) => {
          const volume = Number((event as CustomEvent<{ volume: number }>).detail?.volume)
          if (Number.isFinite(volume)) setAudioVolume(volume)
     })

     isInitialized = true
     renderPlayerBar()
}
