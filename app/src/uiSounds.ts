const volumeChangeEventName = 'swr:volume-change'

const soundDefinitions = {
     click: { src: '/assets/sfx/click.mp3', poolSize: 2 },
     slide: { src: '/assets/sfx/slide.mp3', poolSize: 2 },
     camera: { src: '/assets/sfx/camera.mp3', poolSize: 2 },
     play: { src: '/assets/sfx/play.wav', poolSize: 1 },
     pause: { src: '/assets/sfx/pause.wav', poolSize: 1 },
} as const

export type UiSound = keyof typeof soundDefinitions

type SoundPool = {
     players: HTMLAudioElement[]
     nextPlayerIndex: number
}

const soundPools = new Map<UiSound, SoundPool>()
let masterVolume = 1
let initialized = false

const normalizeVolume = (volume: number) =>
     Math.min(1, Math.max(0, Number.isFinite(volume) ? volume : 0))

const applyMasterVolume = (player: HTMLAudioElement) => {
     player.volume = masterVolume
     player.muted = masterVolume === 0
}

const stopPlayer = (player: HTMLAudioElement) => {
     player.pause()

     try {
          player.currentTime = 0
     } catch {
          // The asset may not have loaded yet. The next play attempt can still retry it.
     }
}

const stopSound = (sound: UiSound) => {
     soundPools.get(sound)?.players.forEach(stopPlayer)
}

export const setUiSoundsVolume = (volume: number) => {
     masterVolume = normalizeVolume(volume)
     soundPools.forEach((pool) =>
          pool.players.forEach((player) => {
               applyMasterVolume(player)
               if (masterVolume === 0) stopPlayer(player)
          })
     )
}

const handleVolumeChange = (event: Event) => {
     const volume = Number(
          (event as CustomEvent<{ volume?: number }>).detail?.volume
     )

     if (Number.isFinite(volume)) setUiSoundsVolume(volume)
}

export const initUiSounds = (initialVolume = 1) => {
     setUiSoundsVolume(initialVolume)
     if (initialized) return

     ;(Object.keys(soundDefinitions) as UiSound[]).forEach((sound) => {
          const definition = soundDefinitions[sound]
          const players = Array.from({ length: definition.poolSize }, () => {
               const player = new Audio(definition.src)
               player.preload = 'auto'
               applyMasterVolume(player)
               return player
          })

          soundPools.set(sound, { players, nextPlayerIndex: 0 })
     })

     window.addEventListener(volumeChangeEventName, handleVolumeChange)
     initialized = true
}

export const playUiSound = (sound: UiSound) => {
     if (!initialized) initUiSounds(masterVolume)
     if (masterVolume === 0) return

     if (sound === 'play' || sound === 'pause') {
          stopSound('play')
          stopSound('pause')
     }

     const pool = soundPools.get(sound)
     if (!pool) return

     const player = pool.players[pool.nextPlayerIndex]
     pool.nextPlayerIndex = (pool.nextPlayerIndex + 1) % pool.players.length
     stopPlayer(player)
     applyMasterVolume(player)

     try {
          const playAttempt = player.play()
          if (playAttempt) void playAttempt.catch(() => undefined)
     } catch {
          // UI actions must stay responsive if an asset is missing or autoplay is blocked.
     }
}
