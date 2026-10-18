/*
 * Copyright (C) 2026 Moremi Vannak
 * SPDX-License-Identifier: MIT
 */
import {
  GLOBAL_SETTINGS_KEY,
  type GlobalSetting,
  GlobalSettingCodec,
  type SiteSetting,
  SiteSettingCodec,
  decodeOr,
  defaultGlobalSetting,
  defaultSiteSetting,
} from '../common/type/settings'

// Pages the content script can't run on (browser and extension pages)
export const SYSTEM_PAGE = 'system-page'

export const getHostname = (urlStr: string): string => {
  try {
    const url = new URL(urlStr)
    return url.protocol === 'http:' || url.protocol === 'https:'
      ? url.hostname
      : SYSTEM_PAGE
  } catch {
    return SYSTEM_PAGE
  }
}

const hasStorage = () =>
  typeof chrome !== 'undefined' && Boolean(chrome.storage?.local)

const getKeys = (keys: string[]): Promise<Record<string, unknown>> =>
  new Promise((resolve) => {
    if (!hasStorage()) resolve({})
    else chrome.storage.local.get(keys, (res) => resolve(res))
  })

const setItems = (items: Record<string, unknown>): Promise<void> =>
  new Promise((resolve, reject) => {
    if (!hasStorage()) {
      reject(new Error('chrome.storage.local is not available'))
      return
    }
    // Content scripts react through chrome.storage.onChanged
    chrome.storage.local.set(items, () => {
      if (chrome.runtime.lastError)
        reject(new Error(chrome.runtime.lastError.message))
      else resolve()
    })
  })

export const loadGlobalSettingPromise = async (): Promise<GlobalSetting> => {
  const res = await getKeys([GLOBAL_SETTINGS_KEY])
  return decodeOr(
    GlobalSettingCodec,
    res[GLOBAL_SETTINGS_KEY],
    defaultGlobalSetting,
  )
}

export const saveGlobalSettingPromise = (
  setting: GlobalSetting,
): Promise<void> => setItems({ [GLOBAL_SETTINGS_KEY]: setting })

export const loadSiteSettingPromise = async (
  hostname: string,
): Promise<SiteSetting> => {
  if (hostname === SYSTEM_PAGE) return defaultSiteSetting
  const res = await getKeys([hostname])
  return decodeOr(SiteSettingCodec, res[hostname], defaultSiteSetting)
}

export const saveSiteSettingPromise = (
  hostname: string,
  setting: SiteSetting,
): Promise<void> =>
  hostname === SYSTEM_PAGE
    ? Promise.reject(new Error('cannot save settings for a system page'))
    : setItems({ [hostname]: setting })

export const queryActiveTabHostnamePromise = (): Promise<string> =>
  new Promise((resolve) => {
    if (typeof chrome === 'undefined' || !chrome.tabs?.query) {
      resolve(SYSTEM_PAGE)
      return
    }
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      resolve(getHostname(tabs[0]?.url ?? ''))
    })
  })
