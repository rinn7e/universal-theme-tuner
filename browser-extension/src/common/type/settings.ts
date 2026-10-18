/*
 * Copyright (C) 2026 Moremi Vannak
 * SPDX-License-Identifier: GPL-3.0-only
 */
import * as t from 'io-ts'

import { DEFAULT_FONT_SIZE } from '../env'
import { type Modes } from '../solarized'

// Storage key for the settings that apply on every site
export const GLOBAL_SETTINGS_KEY = 'global_settings'

export const GlobalSettingCodec = t.type({
  enabled: t.boolean,
  lightEnabled: t.boolean,
  darkEnabled: t.boolean,
  fontSize: t.number,
})

export type GlobalSetting = t.TypeOf<typeof GlobalSettingCodec>

export const defaultGlobalSetting: GlobalSetting = {
  enabled: true,
  lightEnabled: true,
  darkEnabled: false,
  fontSize: DEFAULT_FONT_SIZE,
}

// Stored under the site's hostname
export const SiteSettingCodec = t.type({
  enabled: t.boolean,
})

export type SiteSetting = t.TypeOf<typeof SiteSettingCodec>

export const defaultSiteSetting: SiteSetting = { enabled: true }

// Decodes a stored value, falling back to the default when it is missing or
// malformed
export const decodeOr = <A>(
  codec: t.Type<A>,
  value: unknown,
  fallback: A,
): A => {
  const decoded = codec.decode(value)
  return decoded._tag === 'Right' ? decoded.right : fallback
}

// The modes the content script applies on a site
export const activeModes = (
  global: GlobalSetting,
  site: SiteSetting,
): Modes => {
  const on = global.enabled && site.enabled
  return { light: on && global.lightEnabled, dark: on && global.darkEnabled }
}
