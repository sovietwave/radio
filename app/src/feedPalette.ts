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

interface RankedColor {
     css: string
     rgb: string
     lightness: number
}

const paletteCache = new Map<string, FeedDetailPalette | null>()

const toRgbColor = (color: Color): RgbColor => {
     const rgb = color.rgb()

     return {
          r: Math.round(rgb.r),
          g: Math.round(rgb.g),
          b: Math.round(rgb.b),
     }
}

const getPerceivedLightness = ({ r, g, b }: RgbColor): number =>
     (r * 299 + g * 587 + b * 114) / 1000

const toRankedColor = (color: Color): RankedColor => {
     const rgb = toRgbColor(color)
     const rgbValue = `${rgb.r}, ${rgb.g}, ${rgb.b}`

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
