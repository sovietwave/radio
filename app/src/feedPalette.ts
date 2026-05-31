import { getPaletteSync, type Color } from 'colorthief'

export interface FeedDetailPalette {
     topLeft: string
     topRight: string
     bottomLeft: string
     bottomRight: string
     topLeftRgb: string
     topRightRgb: string
     bottomLeftRgb: string
     bottomRightRgb: string
}

interface RgbColor {
     r: number
     g: number
     b: number
}

interface HslColor {
     h: number
     s: number
     l: number
}

interface OklchColor {
     l: number
     c: number
     h: number
}

interface PaletteCandidate extends RgbColor {
     hsl: HslColor
     oklch: OklchColor
     weight: number
}

interface PaletteColor {
     css: string
     rgb: string
}

interface SampledColorBucket {
     count: number
     r: number
     g: number
     b: number
}

type PaletteRole = 'primary' | 'secondary' | 'support' | 'accent'

const sampledCanvasMaxSize = 160
const sampledColorBucketSize = 12
const sampledColorMinCount = 3
const alphaThreshold = 125
const paletteCache = new Map<string, FeedDetailPalette | null>()

const clamp = (value: number, min: number, max: number): number =>
     Math.min(Math.max(value, min), max)

const toRgbColor = (color: Color): RgbColor => {
     const rgb = color.rgb()

     return {
          r: Math.round(rgb.r),
          g: Math.round(rgb.g),
          b: Math.round(rgb.b),
     }
}

const rgbToHsl = ({ r, g, b }: RgbColor): HslColor => {
     const red = r / 255
     const green = g / 255
     const blue = b / 255
     const max = Math.max(red, green, blue)
     const min = Math.min(red, green, blue)
     const lightness = (max + min) / 2
     const delta = max - min

     if (delta === 0) {
          return { h: 0, s: 0, l: lightness }
     }

     const saturation =
          lightness > 0.5 ? delta / (2 - max - min) : delta / (max + min)
     let hue = 0

     if (max === red) {
          hue = (green - blue) / delta + (green < blue ? 6 : 0)
     } else if (max === green) {
          hue = (blue - red) / delta + 2
     } else {
          hue = (red - green) / delta + 4
     }

     return {
          h: hue / 6,
          s: saturation,
          l: lightness,
     }
}

const hueToRgb = (p: number, q: number, t: number): number => {
     let hue = t

     if (hue < 0) hue += 1
     if (hue > 1) hue -= 1
     if (hue < 1 / 6) return p + (q - p) * 6 * hue
     if (hue < 1 / 2) return q
     if (hue < 2 / 3) return p + (q - p) * (2 / 3 - hue) * 6

     return p
}

const hslToRgb = ({ h, s, l }: HslColor): RgbColor => {
     if (s === 0) {
          const value = Math.round(l * 255)

          return { r: value, g: value, b: value }
     }

     const q = l < 0.5 ? l * (1 + s) : l + s - l * s
     const p = 2 * l - q

     return {
          r: Math.round(hueToRgb(p, q, h + 1 / 3) * 255),
          g: Math.round(hueToRgb(p, q, h) * 255),
          b: Math.round(hueToRgb(p, q, h - 1 / 3) * 255),
     }
}

const srgbToLinear = (value: number): number => {
     const channel = value / 255

     return channel <= 0.04045
          ? channel / 12.92
          : ((channel + 0.055) / 1.055) ** 2.4
}

const rgbToOklchColor = ({ r, g, b }: RgbColor): OklchColor => {
     const red = srgbToLinear(r)
     const green = srgbToLinear(g)
     const blue = srgbToLinear(b)

     const long = Math.cbrt(
          0.4122214708 * red + 0.5363325363 * green + 0.0514459929 * blue
     )
     const medium = Math.cbrt(
          0.2119034982 * red + 0.6806995451 * green + 0.1073969566 * blue
     )
     const short = Math.cbrt(
          0.0883024619 * red + 0.2817188376 * green + 0.6299787005 * blue
     )
     const lightness =
          0.2104542553 * long + 0.793617785 * medium - 0.0040720468 * short
     const a =
          1.9779984951 * long - 2.428592205 * medium + 0.4505937099 * short
     const bAxis =
          0.0259040371 * long + 0.7827717662 * medium - 0.808675766 * short
     const chroma = Math.sqrt(a * a + bAxis * bAxis)
     const hue = ((Math.atan2(bAxis, a) * 180) / Math.PI + 360) % 360

     return {
          l: lightness,
          c: chroma,
          h: hue,
     }
}

const getHueDistance = (left: number, right: number): number => {
     const distance = Math.abs(left - right)

     return Math.min(distance, 1 - distance)
}

const getRgbDistance = (left: RgbColor, right: RgbColor): number =>
     Math.sqrt(
          (left.r - right.r) ** 2 +
               (left.g - right.g) ** 2 +
               (left.b - right.b) ** 2
     )

const getOklchDistance = (
     left: PaletteCandidate,
     right: PaletteCandidate
): number => {
     const hueDistance = getHueDistance(left.oklch.h / 360, right.oklch.h / 360)
     const averageChroma = (left.oklch.c + right.oklch.c) / 2

     return Math.sqrt(
          ((left.oklch.l - right.oklch.l) * 1.6) ** 2 +
               ((left.oklch.c - right.oklch.c) * 3.2) ** 2 +
               (hueDistance * averageChroma * 4) ** 2
     )
}

const getCloseness = (value: number, target: number, range: number): number =>
     clamp(1 - Math.abs(value - target) / range, 0, 1)

const getWeightScore = (candidate: PaletteCandidate): number =>
     clamp(Math.sqrt(candidate.weight) * 3, 0, 1)

const getSaturationScore = (candidate: PaletteCandidate): number =>
     clamp((candidate.hsl.s - 0.03) / 0.42, 0, 1)

const getChromaScore = (candidate: PaletteCandidate): number =>
     clamp(candidate.oklch.c / 0.18, 0, 1)

const getColorfulnessScore = (candidate: PaletteCandidate): number =>
     getSaturationScore(candidate) * 0.55 + getChromaScore(candidate) * 0.45

const getUsableLightnessScore = (candidate: PaletteCandidate): number =>
     getCloseness(candidate.hsl.l, 0.5, 0.48)

const getMediumDarkScore = (candidate: PaletteCandidate): number =>
     getCloseness(candidate.hsl.l, 0.34, 0.32)

const toPaletteCandidate = (
     rgb: RgbColor,
     weight: number
): PaletteCandidate => ({
     ...rgb,
     hsl: rgbToHsl(rgb),
     oklch: rgbToOklchColor(rgb),
     weight,
})

const boostBackgroundColor = (rgb: RgbColor): RgbColor => {
     const hsl = rgbToHsl(rgb)
     if (hsl.s < 0.04) return rgb

     const saturationBoost = 1.22 + getCloseness(hsl.l, 0.52, 0.42) * 0.14

     return hslToRgb({
          ...hsl,
          s: clamp(hsl.s * saturationBoost, 0, 0.92),
     })
}

const toPaletteColor = (rgb: RgbColor): PaletteColor => {
     const boostedRgb = boostBackgroundColor(rgb)
     const rgbValue = `${boostedRgb.r}, ${boostedRgb.g}, ${boostedRgb.b}`

     return {
          css: `rgb(${rgbValue})`,
          rgb: rgbValue,
     }
}

const toFeedDetailPalette = (colors: RgbColor[]): FeedDetailPalette | null => {
     const paletteColors = colors.map(toPaletteColor)

     if (paletteColors.length === 0) return null

     while (paletteColors.length < 4) {
          paletteColors.push(paletteColors[paletteColors.length - 1])
     }

     const [topLeft, topRight, bottomLeft, bottomRight] = paletteColors

     return {
          topLeft: topLeft.css,
          topRight: topRight.css,
          bottomLeft: bottomLeft.css,
          bottomRight: bottomRight.css,
          topLeftRgb: topLeft.rgb,
          topRightRgb: topRight.rgb,
          bottomLeftRgb: bottomLeft.rgb,
          bottomRightRgb: bottomRight.rgb,
     }
}

const getColorthiefCandidates = (
     image: HTMLImageElement
): PaletteCandidate[] => {
     try {
          return (
               getPaletteSync(image, {
                    colorCount: 20,
                    colorSpace: 'oklch',
                    quality: 5,
                    minSaturation: 0.02,
                    ignoreWhite: true,
                    whiteThreshold: 252,
               }) ?? []
          ).map((color) =>
               toPaletteCandidate(toRgbColor(color), color.proportion)
          )
     } catch {
          return []
     }
}

const getSampledCanvasSize = (
     image: HTMLImageElement
): { width: number; height: number } => {
     const scale = Math.min(
          sampledCanvasMaxSize / Math.max(image.naturalWidth, image.naturalHeight),
          1
     )

     return {
          width: Math.max(1, Math.round(image.naturalWidth * scale)),
          height: Math.max(1, Math.round(image.naturalHeight * scale)),
     }
}

const getSampledColorKey = ({ r, g, b }: RgbColor): string =>
     [
          Math.round(r / sampledColorBucketSize),
          Math.round(g / sampledColorBucketSize),
          Math.round(b / sampledColorBucketSize),
     ].join(',')

const getSampledCandidates = (image: HTMLImageElement): PaletteCandidate[] => {
     try {
          const { width, height } = getSampledCanvasSize(image)
          const canvas = document.createElement('canvas')
          canvas.width = width
          canvas.height = height

          const context = canvas.getContext('2d', { willReadFrequently: true })

          if (!context) return []

          context.drawImage(image, 0, 0, width, height)

          const data = context.getImageData(0, 0, width, height).data
          const buckets = new Map<string, SampledColorBucket>()
          let sampledPixelCount = 0

          for (let index = 0; index < data.length; index += 4) {
               const alpha = data[index + 3] ?? 255
               if (alpha < alphaThreshold) continue

               const rgb = {
                    r: data[index],
                    g: data[index + 1],
                    b: data[index + 2],
               }
               const hsl = rgbToHsl(rgb)

               if (
                    hsl.l < 0.03 ||
                    hsl.s < 0.015 ||
                    (rgb.r > 252 && rgb.g > 252 && rgb.b > 252)
               ) {
                    continue
               }

               sampledPixelCount += 1

               const key = getSampledColorKey(rgb)
               const bucket = buckets.get(key)

               if (bucket) {
                    bucket.count += 1
                    bucket.r += rgb.r
                    bucket.g += rgb.g
                    bucket.b += rgb.b
                    continue
               }

               buckets.set(key, {
                    count: 1,
                    r: rgb.r,
                    g: rgb.g,
                    b: rgb.b,
               })
          }

          if (sampledPixelCount === 0) return []

          return [...buckets.values()]
               .filter((bucket) => bucket.count >= sampledColorMinCount)
               .map((bucket) =>
                    toPaletteCandidate(
                         {
                              r: Math.round(bucket.r / bucket.count),
                              g: Math.round(bucket.g / bucket.count),
                              b: Math.round(bucket.b / bucket.count),
                         },
                         bucket.count / sampledPixelCount
                    )
               )
     } catch {
          return []
     }
}

const getFeedDetailCandidates = (
     image: HTMLImageElement
): PaletteCandidate[] => normalizeCandidates([
     ...getColorthiefCandidates(image),
     ...getSampledCandidates(image),
])

const getCandidateImportanceScore = (candidate: PaletteCandidate): number =>
     getWeightScore(candidate) * 0.5 +
     getColorfulnessScore(candidate) * 0.35 +
     getUsableLightnessScore(candidate) * 0.15

const areCandidatesSimilar = (
     left: PaletteCandidate,
     right: PaletteCandidate
): boolean =>
     getRgbDistance(left, right) < 30 ||
     getOklchDistance(left, right) < 0.055 ||
     (left.hsl.s < 0.08 &&
          right.hsl.s < 0.08 &&
          Math.abs(left.hsl.l - right.hsl.l) < 0.1) ||
     (getHueDistance(left.hsl.h, right.hsl.h) < 0.035 &&
          Math.abs(left.hsl.l - right.hsl.l) < 0.08 &&
          Math.abs(left.hsl.s - right.hsl.s) < 0.14)

const mergeCandidates = (
     left: PaletteCandidate,
     right: PaletteCandidate
): PaletteCandidate => {
     const totalWeight = left.weight + right.weight
     const leftWeight = totalWeight > 0 ? left.weight / totalWeight : 0.5
     const rightWeight = totalWeight > 0 ? right.weight / totalWeight : 0.5

     return toPaletteCandidate(
          {
               r: Math.round(left.r * leftWeight + right.r * rightWeight),
               g: Math.round(left.g * leftWeight + right.g * rightWeight),
               b: Math.round(left.b * leftWeight + right.b * rightWeight),
          },
          totalWeight
     )
}

const normalizeCandidates = (
     candidates: PaletteCandidate[]
): PaletteCandidate[] => {
     const sortedCandidates = [...candidates].sort(
          (left, right) =>
               getCandidateImportanceScore(right) - getCandidateImportanceScore(left)
     )
     const mergedCandidates: PaletteCandidate[] = []

     for (const candidate of sortedCandidates) {
          const similarCandidateIndex = mergedCandidates.findIndex((color) =>
               areCandidatesSimilar(candidate, color)
          )

          if (similarCandidateIndex === -1) {
               mergedCandidates.push(candidate)
               continue
          }

          mergedCandidates[similarCandidateIndex] = mergeCandidates(
               mergedCandidates[similarCandidateIndex],
               candidate
          )
     }

     return mergedCandidates.sort(
          (left, right) =>
               getCandidateImportanceScore(right) - getCandidateImportanceScore(left)
     )
}

const getDistinctnessScore = (
     candidate: PaletteCandidate,
     selected: PaletteCandidate[]
): number => {
     if (selected.length === 0) return 1

     const minRgbDistance = Math.min(
          ...selected.map((color) => getRgbDistance(candidate, color))
     )
     const minOklchDistance = Math.min(
          ...selected.map((color) => getOklchDistance(candidate, color))
     )

     return (
          clamp(minRgbDistance / 220, 0, 1) * 0.35 +
          clamp(minOklchDistance / 0.2, 0, 1) * 0.65
     )
}

const isStrictRoleCandidate = (
     candidate: PaletteCandidate,
     role: PaletteRole
): boolean => {
     if (candidate.hsl.l < 0.05 || candidate.hsl.l > 0.96) return false

     const colorfulness = getColorfulnessScore(candidate)
     const weight = getWeightScore(candidate)

     if (role === 'primary') return colorfulness >= 0.08 || weight >= 0.45
     if (role === 'accent') return colorfulness >= 0.18

     return colorfulness >= 0.05 || weight >= 0.35
}

const getAdaptiveRoleScore = (
     candidate: PaletteCandidate,
     role: PaletteRole,
     selected: PaletteCandidate[],
     strict: boolean
): number | null => {
     if (strict && !isStrictRoleCandidate(candidate, role)) return null

     const weight = getWeightScore(candidate)
     const colorfulness = getColorfulnessScore(candidate)
     const lightness = getUsableLightnessScore(candidate)
     const distinctness = getDistinctnessScore(candidate, selected)

     if (role === 'primary') {
          return weight * 0.5 + colorfulness * 0.35 + lightness * 0.15
     }

     if (role === 'secondary') {
          return (
               distinctness * 0.44 +
               weight * 0.28 +
               colorfulness * 0.22 +
               lightness * 0.06
          )
     }

     if (role === 'support') {
          return (
               distinctness * 0.42 +
               getMediumDarkScore(candidate) * 0.22 +
               weight * 0.2 +
               colorfulness * 0.16
          )
     }

     return (
          colorfulness * 0.48 +
          distinctness * 0.34 +
          lightness * 0.1 +
          weight * 0.08
     )
}

const isSimilarToSelected = (
     candidate: PaletteCandidate,
     selected: PaletteCandidate[]
): boolean =>
     selected.some((color) => areCandidatesSimilar(candidate, color))

const selectRoleCandidate = (
     candidates: PaletteCandidate[],
     role: PaletteRole,
     selected: PaletteCandidate[],
     strict: boolean
): PaletteCandidate | null => {
     let bestCandidate: PaletteCandidate | null = null
     let bestScore = 0

     for (const candidate of candidates) {
          if (isSimilarToSelected(candidate, selected)) continue

          const roleScore = getAdaptiveRoleScore(candidate, role, selected, strict)
          if (roleScore === null || roleScore <= bestScore) continue

          bestScore = roleScore
          bestCandidate = candidate
     }

     return bestCandidate
}

const getDistinctCandidateScore = (
     candidate: PaletteCandidate,
     selected: PaletteCandidate[]
): number => {
     return (
          getDistinctnessScore(candidate, selected) * 0.58 +
          getColorfulnessScore(candidate) * 0.24 +
          getWeightScore(candidate) * 0.18
     )
}

const selectDistinctCandidate = (
     candidates: PaletteCandidate[],
     selected: PaletteCandidate[]
): PaletteCandidate | null => {
     let bestCandidate: PaletteCandidate | null = null
     let bestScore = 0

     for (const candidate of candidates) {
          if (isSimilarToSelected(candidate, selected)) continue

          const score = getDistinctCandidateScore(candidate, selected)
          if (score <= bestScore) continue

          bestScore = score
          bestCandidate = candidate
     }

     return bestCandidate
}

const getCornerNeighborDistanceScore = (
     topLeft: PaletteCandidate,
     topRight: PaletteCandidate,
     bottomLeft: PaletteCandidate,
     bottomRight: PaletteCandidate
): number =>
     getOklchDistance(topLeft, topRight) * 0.68 +
     getOklchDistance(topRight, bottomRight) * 0.61 +
     getOklchDistance(bottomRight, bottomLeft) * 0.6 +
     getOklchDistance(bottomLeft, topLeft) * 0.67

const smoothPaletteCornerOrder = (
     selected: PaletteCandidate[]
): PaletteCandidate[] => {
     if (selected.length < 4) return selected

     const [primary, secondary, support, accent] = selected
     const defaultScore = getCornerNeighborDistanceScore(
          primary,
          secondary,
          support,
          accent
     )
     const swappedScore = getCornerNeighborDistanceScore(
          primary,
          support,
          secondary,
          accent
     )

     return swappedScore < defaultScore
          ? [primary, support, secondary, accent]
          : selected
}

const getFeedDetailPaletteColors = (image: HTMLImageElement): RgbColor[] => {
     const candidates = getFeedDetailCandidates(image)
     const selected: PaletteCandidate[] = []
     const roles: PaletteRole[] = ['primary', 'secondary', 'support', 'accent']

     for (const role of roles) {
          const candidate =
               selectRoleCandidate(candidates, role, selected, true) ??
               selectRoleCandidate(candidates, role, selected, false) ??
               selectDistinctCandidate(candidates, selected)

          if (candidate) selected.push(candidate)
     }

     while (selected.length < 4) {
          const candidate = selectDistinctCandidate(candidates, selected)
          if (!candidate) break

          selected.push(candidate)
     }

     return smoothPaletteCornerOrder(selected)
}

export const getFeedDetailPalette = (
     imageUrl: string,
     image: HTMLImageElement
): FeedDetailPalette | null => {
     if (paletteCache.has(imageUrl)) {
          return paletteCache.get(imageUrl) ?? null
     }

     if (!image.complete || image.naturalWidth <= 0 || image.naturalHeight <= 0) {
          return null
     }

     try {
          const colors = getFeedDetailPaletteColors(image)
          const palette = toFeedDetailPalette(colors)

          paletteCache.set(imageUrl, palette)
          return palette
     } catch {
          paletteCache.set(imageUrl, null)
          return null
     }
}
