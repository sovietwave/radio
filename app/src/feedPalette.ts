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

interface RankedColor {
     css: string
     rgb: string
     lightness: number
}

const backgroundSaturationMultiplier = 2
const backgroundLightnessMultiplier = 0.5
const backgroundMinLightness = 0.08
const backgroundMaxLightness = 0.42
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

const tuneBackgroundColor = (rgb: RgbColor): RgbColor => {
     const hsl = rgbToHsl(rgb)

     return hslToRgb({
          h: hsl.h,
          s: clamp(hsl.s * backgroundSaturationMultiplier, 0, 1),
          l: clamp(
               hsl.l * backgroundLightnessMultiplier,
               backgroundMinLightness,
               backgroundMaxLightness
          ),
     })
}

const getPerceivedLightness = ({ r, g, b }: RgbColor): number =>
     (r * 299 + g * 587 + b * 114) / 1000

const toRankedColor = (color: Color): RankedColor => {
     const rgb = toRgbColor(color)
     const tunedRgb = tuneBackgroundColor(rgb)
     const rgbValue = `${tunedRgb.r}, ${tunedRgb.g}, ${tunedRgb.b}`

     return {
          css: `rgb(${rgbValue})`,
          rgb: rgbValue,
          lightness: getPerceivedLightness(rgb),
     }
}

const toFeedDetailPalette = (colors: Color[]): FeedDetailPalette | null => {
     const rankedColors = colors
          .map(toRankedColor)
          .sort((left, right) => right.lightness - left.lightness)

     if (rankedColors.length === 0) return null

     while (rankedColors.length < 4) {
          rankedColors.push(rankedColors[rankedColors.length - 1])
     }

     const [topLeft, topRight, bottomLeft, bottomRight] = rankedColors

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
          const colors =
               getPaletteSync(image, {
                    colorCount: 4,
                    colorSpace: 'oklch',
                    quality: 10,
               }) ?? []
          const palette = toFeedDetailPalette(colors)

          paletteCache.set(imageUrl, palette)
          return palette
     } catch {
          paletteCache.set(imageUrl, null)
          return null
     }
}
