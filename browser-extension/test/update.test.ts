/*
 * Copyright (C) 2026 Moremi Vannak
 * SPDX-License-Identifier: GPL-3.0-only
 */
import { describe, expect, it } from 'vitest'

import {
  GlobalSettingCodec,
  SiteSettingCodec,
  activeModes,
  decodeOr,
  defaultGlobalSetting,
  defaultSiteSetting,
} from '../src/common/type/settings'
import { SYSTEM_PAGE, getHostname } from '../src/storage/storage'
import { type Model } from '../src/type'
import {
  MAX_FONT_SIZE,
  MIN_FONT_SIZE,
  handleInit,
  handleSetFontSize,
  handleToggleDarkEnabled,
  handleToggleGlobalEnabled,
  handleToggleLightEnabled,
  handleToggleSiteEnabled,
} from '../src/update'

const model: Model = {
  global: defaultGlobalSetting,
  hostname: 'example.com',
  isSystemPage: false,
  site: defaultSiteSetting,
}

describe('handleInit', () => {
  it('builds the model from the loaded settings', () => {
    const [next] = handleInit({ _tag: 'Init', ...model })
    expect(next).toEqual(model)
  })
})

describe('handleToggleGlobalEnabled', () => {
  it('turns everything off and back on in one click, keeping the mode toggles', () => {
    const [off] = handleToggleGlobalEnabled(model)
    expect(off.global).toEqual({ ...model.global, enabled: false })
    const [on] = handleToggleGlobalEnabled(off)
    expect(on.global).toEqual(model.global)
  })
})

describe('mode toggles', () => {
  it('flip only their own mode', () => {
    expect(handleToggleLightEnabled(model)[0].global.lightEnabled).toBe(
      !model.global.lightEnabled,
    )
    expect(handleToggleDarkEnabled(model)[0].global.darkEnabled).toBe(
      !model.global.darkEnabled,
    )
    expect(handleToggleDarkEnabled(model)[0].global.lightEnabled).toBe(
      model.global.lightEnabled,
    )
  })
})

describe('handleToggleSiteEnabled', () => {
  it('flips the current site', () => {
    expect(handleToggleSiteEnabled(model)[0].site.enabled).toBe(false)
  })

  it('does nothing on a browser page', () => {
    const system = { ...model, hostname: SYSTEM_PAGE, isSystemPage: true }
    expect(handleToggleSiteEnabled(system)[0]).toBe(system)
  })
})

describe('handleSetFontSize', () => {
  it('clamps to the allowed range', () => {
    expect(handleSetFontSize(model, 100)[0].global.fontSize).toBe(MAX_FONT_SIZE)
    expect(handleSetFontSize(model, 1)[0].global.fontSize).toBe(MIN_FONT_SIZE)
    expect(handleSetFontSize(model, 18)[0].global.fontSize).toBe(18)
  })
})

describe('activeModes', () => {
  it('follows the mode toggles while on', () => {
    expect(activeModes(defaultGlobalSetting, defaultSiteSetting)).toEqual({
      light: true,
      dark: false,
    })
    expect(
      activeModes(
        { ...defaultGlobalSetting, darkEnabled: true },
        defaultSiteSetting,
      ),
    ).toEqual({
      light: true,
      dark: true,
    })
  })

  it('turns both modes off when disabled globally or on the site', () => {
    const all = { ...defaultGlobalSetting, darkEnabled: true }
    expect(activeModes({ ...all, enabled: false }, defaultSiteSetting)).toEqual(
      { light: false, dark: false },
    )
    expect(activeModes(all, { enabled: false })).toEqual({
      light: false,
      dark: false,
    })
  })
})

describe('decodeOr', () => {
  it('keeps valid stored settings', () => {
    const stored = { ...defaultGlobalSetting, darkEnabled: true }
    expect(decodeOr(GlobalSettingCodec, stored, defaultGlobalSetting)).toEqual(
      stored,
    )
  })

  it('falls back on missing or malformed values', () => {
    expect(decodeOr(GlobalSettingCodec, undefined, defaultGlobalSetting)).toBe(
      defaultGlobalSetting,
    )
    expect(
      decodeOr(SiteSettingCodec, { enabled: 'yes' }, defaultSiteSetting),
    ).toBe(defaultSiteSetting)
  })
})

describe('getHostname', () => {
  it('reads web pages and rejects browser pages', () => {
    expect(getHostname('https://news.ycombinator.com/item?id=1')).toBe(
      'news.ycombinator.com',
    )
    expect(getHostname('chrome://extensions')).toBe(SYSTEM_PAGE)
    expect(getHostname('about:blank')).toBe(SYSTEM_PAGE)
    expect(getHostname('')).toBe(SYSTEM_PAGE)
  })
})
