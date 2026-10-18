/*
 * Copyright (C) 2026 Moremi Vannak
 * SPDX-License-Identifier: MIT
 */
import { Cmd, Task } from 'tea-cup-fp'

import {
  type GlobalSetting,
  type SiteSetting,
  defaultGlobalSetting,
  defaultSiteSetting,
} from './common/type/settings'
import {
  SYSTEM_PAGE,
  loadGlobalSettingPromise,
  loadSiteSettingPromise,
  queryActiveTabHostnamePromise,
  saveGlobalSettingPromise,
  saveSiteSettingPromise,
} from './storage/storage'
import { type Model, type Msg } from './type'

export const MIN_FONT_SIZE = 12
export const MAX_FONT_SIZE = 32

const loadAll = async (): Promise<Extract<Msg, { _tag: 'Init' }>> => {
  const global = await loadGlobalSettingPromise()
  const hostname = await queryActiveTabHostnamePromise()
  const site = await loadSiteSettingPromise(hostname)
  return {
    _tag: 'Init',
    global,
    hostname,
    isSystemPage: hostname === SYSTEM_PAGE,
    site,
  }
}

export const init = (): [Model | null, Cmd<Msg>] => [
  null,
  Task.attempt(Task.fromPromise(loadAll), (result): Msg =>
    result.tag === 'Ok'
      ? result.value
      : {
          _tag: 'Init',
          global: defaultGlobalSetting,
          hostname: SYSTEM_PAGE,
          isSystemPage: true,
          site: defaultSiteSetting,
        },
  ),
]

const saveGlobalCmd = (global: GlobalSetting): Cmd<Msg> =>
  Task.attempt(
    Task.fromPromise(() => saveGlobalSettingPromise(global)),
    (): Msg => ({ _tag: 'NoOp' }),
  )

const saveSiteCmd = (hostname: string, site: SiteSetting): Cmd<Msg> =>
  Task.attempt(
    Task.fromPromise(() => saveSiteSettingPromise(hostname, site)),
    (): Msg => ({ _tag: 'NoOp' }),
  )

export const setRootFontSizeCmd = (fontSize: number): Cmd<Msg> =>
  Task.attempt(
    Task.fromPromise(() => {
      if (typeof document !== 'undefined')
        document.documentElement.style.fontSize = `${fontSize}px`
      return Promise.resolve()
    }),
    (): Msg => ({ _tag: 'NoOp' }),
  )

// Sub-updaters, pure and tested in test/update.test.ts

export const handleInit = (
  msg: Extract<Msg, { _tag: 'Init' }>,
): [Model, Cmd<Msg>] => [
  {
    global: msg.global,
    hostname: msg.hostname,
    isSystemPage: msg.isSystemPage,
    site: msg.site,
  },
  setRootFontSizeCmd(msg.global.fontSize),
]

const withGlobal = (model: Model, global: GlobalSetting): [Model, Cmd<Msg>] => [
  { ...model, global },
  saveGlobalCmd(global),
]

// One switch for everything, so turning off doesn't need two clicks
export const handleToggleGlobalEnabled = (model: Model): [Model, Cmd<Msg>] =>
  withGlobal(model, { ...model.global, enabled: !model.global.enabled })

export const handleToggleLightEnabled = (model: Model): [Model, Cmd<Msg>] =>
  withGlobal(model, {
    ...model.global,
    lightEnabled: !model.global.lightEnabled,
  })

export const handleToggleDarkEnabled = (model: Model): [Model, Cmd<Msg>] =>
  withGlobal(model, { ...model.global, darkEnabled: !model.global.darkEnabled })

export const handleToggleSiteEnabled = (model: Model): [Model, Cmd<Msg>] => {
  if (model.isSystemPage) return [model, Cmd.none()]
  const site = { ...model.site, enabled: !model.site.enabled }
  return [{ ...model, site }, saveSiteCmd(model.hostname, site)]
}

export const handleSetFontSize = (
  model: Model,
  fontSize: number,
): [Model, Cmd<Msg>] => {
  const clamped = Math.min(MAX_FONT_SIZE, Math.max(MIN_FONT_SIZE, fontSize))
  const global = { ...model.global, fontSize: clamped }
  return [
    { ...model, global },
    Cmd.batch([saveGlobalCmd(global), setRootFontSizeCmd(clamped)]),
  ]
}

export const update = (
  msg: Msg,
  model: Model | null,
): [Model | null, Cmd<Msg>] => {
  if (msg._tag === 'Init') return handleInit(msg)
  if (!model) return [null, Cmd.none()]
  switch (msg._tag) {
    case 'ToggleGlobalEnabled':
      return handleToggleGlobalEnabled(model)
    case 'ToggleLightEnabled':
      return handleToggleLightEnabled(model)
    case 'ToggleDarkEnabled':
      return handleToggleDarkEnabled(model)
    case 'ToggleSiteEnabled':
      return handleToggleSiteEnabled(model)
    case 'SetFontSize':
      return handleSetFontSize(model, msg.fontSize)
    case 'NoOp':
      return [model, Cmd.none()]
  }
}
