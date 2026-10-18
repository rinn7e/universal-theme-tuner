/*
 * Copyright (C) 2026 Moremi Vannak
 * SPDX-License-Identifier: MIT
 */
import { type GlobalSetting, type SiteSetting } from './common/type/settings'

export interface Model {
  global: GlobalSetting
  hostname: string
  isSystemPage: boolean
  site: SiteSetting
}

export type Msg =
  | {
      _tag: 'Init'
      global: GlobalSetting
      hostname: string
      isSystemPage: boolean
      site: SiteSetting
    }
  | { _tag: 'ToggleGlobalEnabled' }
  | { _tag: 'ToggleLightEnabled' }
  | { _tag: 'ToggleDarkEnabled' }
  | { _tag: 'ToggleSiteEnabled' }
  | { _tag: 'SetFontSize'; fontSize: number }
  | { _tag: 'NoOp' }
