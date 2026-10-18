/*
 * Copyright (C) 2026 Moremi Vannak
 * SPDX-License-Identifier: MIT
 */

// Solarized tones a neutral background is swapped for. Light tones go from
// the page canvas (base3) to the darker panel gray; dark tones from the page
// canvas (base03) to a raised panel.
export const LIGHT_TONES = {
  base3: '#fdf6e3',
  mid: '#f5efdc',
  base2: '#eee8d5',
  deep: '#e4ddc8',
} as const

export const DARK_TONES = {
  base03: '#002b36',
  base02: '#073642',
  raised: '#0d4251',
} as const

export type Tone = keyof typeof LIGHT_TONES | keyof typeof DARK_TONES

export const TONE_COLORS: Record<Tone, string> = {
  ...LIGHT_TONES,
  ...DARK_TONES,
}

export interface Rgba {
  r: number
  g: number
  b: number
  a: number
}

// Parses a computed color: `rgb(r, g, b)`, `rgba(r, g, b, a)` or the space
// syntax `rgb(r g b / a)`. Anything else (named colors never appear in
// computed styles, `color(...)` spaces are skipped) returns null.
export const parseColor = (value: string): Rgba | null => {
  const m =
    /^rgba?\(\s*([\d.]+)[\s,]+([\d.]+)[\s,]+([\d.]+)(?:\s*[,/]\s*([\d.]+%?))?\s*\)$/.exec(
      value.trim(),
    )
  if (!m) return null
  const alpha =
    m[4] === undefined
      ? 1
      : m[4].endsWith('%')
        ? Number(m[4].slice(0, -1)) / 100
        : Number(m[4])
  return { r: Number(m[1]), g: Number(m[2]), b: Number(m[3]), a: alpha }
}

// Backgrounds below this opacity are overlays and scrims; recoloring them
// would tint whatever is underneath, so they stay as they are
const MIN_ALPHA = 0.85

// How far apart the channels may be (0-255) for a color to count as a gray
const MAX_CHROMA = 24

// Lightness (0-1, HSL) bands for each tone
const lightness = ({ r, g, b }: Rgba): number =>
  (Math.max(r, g, b) + Math.min(r, g, b)) / 2 / 255

export const isNeutral = (c: Rgba): boolean =>
  c.a >= MIN_ALPHA &&
  Math.max(c.r, c.g, c.b) - Math.min(c.r, c.g, c.b) <= MAX_CHROMA

// The light tone for a near-white or light-gray background, or null
export const lightToneFor = (c: Rgba): keyof typeof LIGHT_TONES | null => {
  if (!isNeutral(c)) return null
  const l = lightness(c)
  if (l >= 0.965) return 'base3'
  if (l >= 0.925) return 'mid'
  if (l >= 0.86) return 'base2'
  if (l >= 0.8) return 'deep'
  return null
}

// The dark tone for a near-black or dark-gray background, or null
export const darkToneFor = (c: Rgba): keyof typeof DARK_TONES | null => {
  if (!isNeutral(c)) return null
  const l = lightness(c)
  if (l <= 0.07) return 'base03'
  if (l <= 0.14) return 'base02'
  if (l <= 0.22) return 'raised'
  return null
}

export interface Modes {
  light: boolean
  dark: boolean
}

// The tone a computed background color should become under the enabled
// modes, or null to leave it alone
export const toneFor = (value: string, modes: Modes): Tone | null => {
  const c = parseColor(value)
  if (!c) return null
  if (modes.light) {
    const tone = lightToneFor(c)
    if (tone) return tone
  }
  if (modes.dark) {
    const tone = darkToneFor(c)
    if (tone) return tone
  }
  return null
}

const hexToRgb = (hex: string): Rgba => ({
  r: parseInt(hex.slice(1, 3), 16),
  g: parseInt(hex.slice(3, 5), 16),
  b: parseInt(hex.slice(5, 7), 16),
  a: 1,
})

// Every color token in a computed value (computed styles spell colors as
// rgb()/rgba())
const COLOR_TOKEN = /rgba?\([^)]*\)/g

// A computed background-image with its gradient stops swapped for Solarized
// tones, keeping each stop's transparency, or null to leave it alone. Only
// gradients whose visible stops are all grays in an enabled band are swapped
// (fades to white, like Google's "Show more"); images and gradients with any
// colored stop keep their design
export const recolorGradient = (image: string, modes: Modes): string | null => {
  if (!image.includes('gradient(') || image.includes('url(')) return null
  let changed = false
  let keep = false
  const result = image.replace(COLOR_TOKEN, (token) => {
    const c = parseColor(token)
    if (!c) {
      keep = true
      return token
    }
    // Fully transparent stops only shape the fade
    if (c.a === 0) return token
    const opaque = { ...c, a: 1 }
    const tone =
      (modes.light ? lightToneFor(opaque) : null) ??
      (modes.dark ? darkToneFor(opaque) : null)
    if (!tone) {
      keep = true
      return token
    }
    changed = true
    const { r, g, b } = hexToRgb(TONE_COLORS[tone])
    return c.a === 1
      ? `rgb(${r}, ${g}, ${b})`
      : `rgba(${r}, ${g}, ${b}, ${c.a})`
  })
  return changed && !keep ? result : null
}

// Seconds or milliseconds in a CSS time value, as milliseconds
const toMs = (time: string): number =>
  time.endsWith('ms') ? parseFloat(time) : parseFloat(time) * 1000

// Whether computed transition-property and transition-duration lists animate
// the background color; the durations repeat to fill the property list, as
// in CSS
export const animatesBackground = (
  property: string,
  duration: string,
): boolean => {
  const durations = duration.split(',').map((d) => d.trim())
  return property
    .split(',')
    .map((p) => p.trim())
    .some(
      (p, i) =>
        ['all', 'background', 'background-color'].includes(p) &&
        toMs(durations[i % durations.length] ?? '0s') > 0,
    )
}
