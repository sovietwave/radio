const noiseAssetUrl = '/assets/sfx/radio-static.wav'
const relativeNoiseLevel = 0.28
const volumeRampSeconds = 0.08
const fadeInSeconds = 0.7
const fadeOutSeconds = 0.9

type AudioContextWithWebkit = typeof globalThis & {
     webkitAudioContext?: typeof AudioContext
}

type NoiseGraph = {
     source: AudioBufferSourceNode
     dryGain: GainNode
     filter: BiquadFilterNode
     filteredGain: GainNode
     lfoSlow: OscillatorNode
     lfoSlowDepth: GainNode
     lfoFast: OscillatorNode
     lfoFastDepth: GainNode
}

class RadioNoiseController {
     private context: AudioContext | null = null
     private masterGain: GainNode | null = null
     private graph: NoiseGraph | null = null
     private assetPromise: Promise<ArrayBuffer> | null = null
     private bufferPromise: Promise<AudioBuffer> | null = null
     private stopTimer: ReturnType<typeof setTimeout> | null = null
     private volume = 1
     private shouldPlay = false
     private loadFailed = false

     preload() {
          void this.getAsset().catch(() => {})
     }

     async unlock() {
          const context = this.getContext()
          if (!context) return

          try {
               if (context.state === 'suspended') await context.resume()
               await this.getBuffer(context)
               this.startIfNeeded()
          } catch (loadError) {
               this.reportLoadError(loadError)
          }
     }

     setVolume(volume: number) {
          this.volume = Math.min(1, Math.max(0, volume))
          if (!this.context || !this.masterGain) return

          this.rampMasterGain(
               this.shouldPlay ? this.getTargetGain() : 0,
               volumeRampSeconds
          )
     }

     fadeIn() {
          this.shouldPlay = true
          this.clearStopTimer()

          const context = this.getContext()
          if (!context) return

          void this.unlock().then(() => {
               if (!this.shouldPlay || !this.masterGain) return
               this.startIfNeeded()
               this.rampMasterGain(this.getTargetGain(), fadeInSeconds)
          })
     }

     fadeOut(durationSeconds = fadeOutSeconds) {
          this.shouldPlay = false
          this.clearStopTimer()

          if (!this.context || !this.masterGain || !this.graph) return

          this.rampMasterGain(0, durationSeconds)
          this.stopTimer = setTimeout(() => {
               if (!this.shouldPlay) this.stopGraph()
          }, Math.ceil(durationSeconds * 1000) + 50)
     }

     stopImmediately() {
          this.shouldPlay = false
          this.clearStopTimer()

          if (this.context && this.masterGain) {
               const now = this.context.currentTime
               this.masterGain.gain.cancelScheduledValues(now)
               this.masterGain.gain.setValueAtTime(0, now)
          }

          this.stopGraph()
     }

     private getContext() {
          if (this.context) return this.context

          const AudioContextConstructor =
               globalThis.AudioContext ||
               (globalThis as AudioContextWithWebkit).webkitAudioContext

          if (!AudioContextConstructor) {
               this.loadFailed = true
               console.warn('Web Audio API is unavailable; radio noise is disabled')
               return null
          }

          this.context = new AudioContextConstructor()
          this.masterGain = this.context.createGain()
          this.masterGain.gain.value = 0
          this.masterGain.connect(this.context.destination)

          return this.context
     }

     private getAsset() {
          if (!this.assetPromise) {
               this.assetPromise = fetch(noiseAssetUrl).then((response) => {
                    if (!response.ok) {
                         throw new Error(`Radio noise request failed: ${response.status}`)
                    }

                    return response.arrayBuffer()
               })
          }

          return this.assetPromise
     }

     private getBuffer(context: AudioContext) {
          if (!this.bufferPromise) {
               this.bufferPromise = this.getAsset().then((asset) =>
                    context.decodeAudioData(asset.slice(0))
               )
          }

          return this.bufferPromise
     }

     private startIfNeeded() {
          if (
               !this.shouldPlay ||
               this.graph ||
               !this.context ||
               !this.masterGain ||
               !this.bufferPromise ||
               this.loadFailed
          ) {
               return
          }

          void this.bufferPromise
               .then((buffer) => {
                    if (
                         !this.shouldPlay ||
                         this.graph ||
                         !this.context ||
                         !this.masterGain
                    ) {
                         return
                    }

                    const context = this.context
                    const source = context.createBufferSource()
                    const dryGain = context.createGain()
                    const filter = context.createBiquadFilter()
                    const filteredGain = context.createGain()
                    const lfoSlow = context.createOscillator()
                    const lfoSlowDepth = context.createGain()
                    const lfoFast = context.createOscillator()
                    const lfoFastDepth = context.createGain()

                    source.buffer = buffer
                    source.loop = true
                    dryGain.gain.value = 0.62
                    filter.type = 'bandpass'
                    filter.frequency.value = 2200
                    filter.Q.value = 0.75
                    filteredGain.gain.value = 0.48

                    lfoSlow.type = 'sine'
                    lfoSlow.frequency.value = 0.037
                    lfoSlowDepth.gain.value = 600
                    lfoFast.type = 'sine'
                    lfoFast.frequency.value = 0.11
                    lfoFastDepth.gain.value = 1000

                    source.connect(dryGain).connect(this.masterGain)
                    source.connect(filter).connect(filteredGain).connect(this.masterGain)
                    lfoSlow.connect(lfoSlowDepth).connect(filter.frequency)
                    lfoFast.connect(lfoFastDepth).connect(filter.frequency)

                    this.graph = {
                         source,
                         dryGain,
                         filter,
                         filteredGain,
                         lfoSlow,
                         lfoSlowDepth,
                         lfoFast,
                         lfoFastDepth,
                    }

                    const now = context.currentTime
                    source.start(now)
                    lfoSlow.start(now)
                    lfoFast.start(now)
                    this.rampMasterGain(this.getTargetGain(), fadeInSeconds)
               })
               .catch((loadError) => this.reportLoadError(loadError))
     }

     private rampMasterGain(target: number, durationSeconds: number) {
          if (!this.context || !this.masterGain) return

          const now = this.context.currentTime
          const gain = this.masterGain.gain
          gain.cancelScheduledValues(now)
          gain.setValueAtTime(gain.value, now)
          gain.linearRampToValueAtTime(target, now + durationSeconds)
     }

     private getTargetGain() {
          return this.volume * relativeNoiseLevel
     }

     private stopGraph() {
          if (!this.graph) return

          const graph = this.graph
          this.graph = null

          for (const oscillator of [graph.lfoSlow, graph.lfoFast]) {
               try {
                    oscillator.stop()
               } catch {}
          }

          try {
               graph.source.stop()
          } catch {}

          graph.source.disconnect()
          graph.dryGain.disconnect()
          graph.filter.disconnect()
          graph.filteredGain.disconnect()
          graph.lfoSlow.disconnect()
          graph.lfoSlowDepth.disconnect()
          graph.lfoFast.disconnect()
          graph.lfoFastDepth.disconnect()
     }

     private clearStopTimer() {
          if (this.stopTimer === null) return
          clearTimeout(this.stopTimer)
          this.stopTimer = null
     }

     private reportLoadError(loadError: unknown) {
          if (this.loadFailed) return
          this.loadFailed = true
          console.warn('Radio noise could not be loaded', loadError)
     }
}

export const radioNoise = new RadioNoiseController()
