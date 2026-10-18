/*
 * Copyright (C) 2026 Moremi Vannak
 * SPDX-License-Identifier: GPL-3.0-only
 */
import { describe, expect, it } from 'vitest'

import {
  animatesBackground,
  darkToneFor,
  isNeutral,
  lightToneFor,
  parseColor,
  recolorGradient,
  toneFor,
} from '../src/common/solarized'

const both = { light: true, dark: true }

describe('parseColor', () => {
  it('reads rgb and rgba', () => {
    expect(parseColor('rgb(255, 255, 255)')).toEqual({
      r: 255,
      g: 255,
      b: 255,
      a: 1,
    })
    expect(parseColor('rgba(0, 0, 0, 0.5)')).toEqual({
      r: 0,
      g: 0,
      b: 0,
      a: 0.5,
    })
  })

  it('reads the space syntax with a percent alpha', () => {
    expect(parseColor('rgb(10 20 30 / 40%)')).toEqual({
      r: 10,
      g: 20,
      b: 30,
      a: 0.4,
    })
  })

  it('returns null for colors it cannot read', () => {
    expect(parseColor('transparent')).toBeNull()
    expect(parseColor('color(display-p3 1 1 1)')).toBeNull()
    expect(parseColor('')).toBeNull()
  })
})

describe('isNeutral', () => {
  it('accepts grays and near-grays', () => {
    expect(isNeutral({ r: 243, g: 244, b: 246, a: 1 })).toBe(true)
  })

  it('rejects colored and translucent backgrounds', () => {
    expect(isNeutral({ r: 59, g: 130, b: 246, a: 1 })).toBe(false)
    expect(isNeutral({ r: 255, g: 255, b: 255, a: 0.5 })).toBe(false)
  })
})

describe('lightToneFor', () => {
  it('maps white to base3', () => {
    expect(lightToneFor({ r: 255, g: 255, b: 255, a: 1 })).toBe('base3')
  })

  it('maps light grays to deeper tones by lightness', () => {
    expect(lightToneFor({ r: 243, g: 244, b: 246, a: 1 })).toBe('mid') // Tailwind gray-100
    expect(lightToneFor({ r: 229, g: 231, b: 235, a: 1 })).toBe('base2') // gray-200
    expect(lightToneFor({ r: 209, g: 213, b: 219, a: 1 })).toBe('deep') // gray-300
  })

  it('leaves mid grays and darker alone', () => {
    expect(lightToneFor({ r: 156, g: 163, b: 175, a: 1 })).toBeNull()
  })
})

describe('darkToneFor', () => {
  it('maps black to base03', () => {
    expect(darkToneFor({ r: 0, g: 0, b: 0, a: 1 })).toBe('base03')
  })

  it('maps dark grays to raised tones by lightness', () => {
    expect(darkToneFor({ r: 30, g: 30, b: 30, a: 1 })).toBe('base02')
    expect(darkToneFor({ r: 48, g: 48, b: 50, a: 1 })).toBe('raised')
  })

  it('leaves mid grays and lighter alone', () => {
    expect(darkToneFor({ r: 90, g: 90, b: 90, a: 1 })).toBeNull()
  })
})

describe('toneFor', () => {
  it('only recolors the enabled modes', () => {
    expect(
      toneFor('rgb(255, 255, 255)', { light: false, dark: true }),
    ).toBeNull()
    expect(toneFor('rgb(0, 0, 0)', { light: true, dark: false })).toBeNull()
    expect(toneFor('rgb(255, 255, 255)', both)).toBe('base3')
    expect(toneFor('rgb(0, 0, 0)', both)).toBe('base03')
  })

  it('leaves colored, transparent and unreadable backgrounds alone', () => {
    expect(toneFor('rgb(37, 99, 235)', both)).toBeNull()
    expect(toneFor('rgba(0, 0, 0, 0)', both)).toBeNull()
    expect(toneFor('transparent', both)).toBeNull()
  })
})

describe('animatesBackground', () => {
  it('spots background transitions', () => {
    // Damn Center's pads: `width 0.15s, background 0.15s`
    expect(animatesBackground('width, background', '0.15s, 0.15s')).toBe(true)
    expect(animatesBackground('all', '200ms')).toBe(true)
    expect(animatesBackground('background-color', '0.3s')).toBe(true)
  })

  it('ignores other properties and zero durations', () => {
    expect(animatesBackground('opacity, transform', '0.2s')).toBe(false)
    expect(animatesBackground('all', '0s')).toBe(false)
    expect(animatesBackground('width, background', '0.15s, 0s')).toBe(false)
  })

  it('repeats a shorter duration list, as CSS does', () => {
    expect(animatesBackground('width, background-color', '0.2s')).toBe(true)
  })
})

describe('recolorGradient', () => {
  const light = { light: true, dark: false }

  it("recolors a fade to white, keeping each stop's transparency", () => {
    // Google's "Show more" fade
    expect(
      recolorGradient(
        'linear-gradient(rgba(0, 0, 0, 0) 0px, rgba(255, 255, 255, 0.9) 52px, rgb(255, 255, 255) 80px)',
        light,
      ),
    ).toBe(
      'linear-gradient(rgba(0, 0, 0, 0) 0px, rgba(253, 246, 227, 0.9) 52px, rgb(253, 246, 227) 80px)',
    )
  })

  it('recolors dark fades in dark mode only', () => {
    const fade = 'linear-gradient(rgba(0, 0, 0, 0), rgb(0, 0, 0))'
    expect(recolorGradient(fade, light)).toBeNull()
    expect(recolorGradient(fade, { light: false, dark: true })).toBe(
      'linear-gradient(rgba(0, 0, 0, 0), rgb(0, 43, 54))',
    )
  })

  it('leaves gradients with a colored stop, images and plain values alone', () => {
    expect(
      recolorGradient(
        'conic-gradient(rgb(49, 134, 255) 34%, rgb(255, 255, 255) 50%)',
        light,
      ),
    ).toBeNull()
    expect(
      recolorGradient(
        'url("a.png"), linear-gradient(rgb(255, 255, 255), rgb(255, 255, 255))',
        light,
      ),
    ).toBeNull()
    expect(recolorGradient('none', light)).toBeNull()
  })

  it('leaves gradients with only transparent stops alone', () => {
    expect(
      recolorGradient(
        'linear-gradient(rgba(0, 0, 0, 0), rgba(0, 0, 0, 0))',
        light,
      ),
    ).toBeNull()
  })
})
