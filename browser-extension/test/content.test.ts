/*
 * Copyright (C) 2026 Moremi Vannak
 * SPDX-License-Identifier: GPL-3.0-only
 */
// @vitest-environment jsdom
// @vitest-environment-options { "url": "https://example.com/" }
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import {
  type GlobalSetting,
  defaultGlobalSetting,
} from '../src/common/type/settings'

type ChangeListener = (changes: Record<string, unknown>, area: string) => void

let store: Record<string, unknown> = {}
let changeListeners: ChangeListener[] = []
let themeListeners: Array<() => void> = []

// Observers each loaded copy of the script starts, disconnected after every
// test so one test's script can't react to a later test's page
const startedObservers: MutationObserver[] = []
const RealMutationObserver = globalThis.MutationObserver
class RecordedMutationObserver extends RealMutationObserver {
  constructor(callback: MutationCallback) {
    super(callback)
    startedObservers.push(this)
  }
}

const installChrome = () => {
  changeListeners = []
  vi.stubGlobal('chrome', {
    storage: {
      local: {
        get: (_keys: string[], cb: (res: Record<string, unknown>) => void) =>
          cb({ ...store }),
      },
      onChanged: {
        addListener: (fn: ChangeListener) => changeListeners.push(fn),
      },
    },
  })
  vi.stubGlobal('MutationObserver', RecordedMutationObserver)
  // jsdom has no matchMedia; the page is in light mode
  themeListeners = []
  vi.stubGlobal(
    'matchMedia',
    (query: string) =>
      ({
        matches: false,
        media: query,
        addEventListener: (_type: string, fn: () => void) =>
          themeListeners.push(fn),
        removeEventListener: () => {},
      }) as unknown as MediaQueryList,
  )
}

// Writes settings the way the popup does and notifies the content script
const saveSettings = (items: Record<string, unknown>) => {
  store = { ...store, ...items }
  changeListeners.forEach((fn) => fn(items, 'local'))
}

// Lets storage callbacks, batches and mutation records finish
const settle = async () => {
  for (let i = 0; i < 5; i++)
    await new Promise((resolve) => setTimeout(resolve, 0))
}

const loadScript = async () => {
  vi.resetModules()
  await import('../src/worker/content')
  await settle()
}

const tone = (selector: string) =>
  document.querySelector(selector)?.getAttribute('data-solarize') ?? null

const page = `
  <style>
    .white { background-color: #ffffff; }
    .gray { background-color: rgb(229, 231, 235); }
    .black { background-color: #000000; }
    .blue { background-color: rgb(37, 99, 235); }
  </style>
  <div class="white" id="white">white</div>
  <div class="gray" id="gray">gray</div>
  <div class="black" id="black">black</div>
  <div class="blue" id="blue">blue</div>
`

const globalWith = (patch: Partial<GlobalSetting>): GlobalSetting => ({
  ...defaultGlobalSetting,
  ...patch,
})

beforeEach(() => {
  store = {}
  document.documentElement.removeAttribute('data-solarize')
  document.head.innerHTML = ''
  document.body.innerHTML = page
  installChrome()
})

afterEach(() => {
  startedObservers.splice(0).forEach((observer) => observer.disconnect())
  document.getElementById('solarize-extension-style')?.remove()
  vi.unstubAllGlobals()
})

describe('content script', () => {
  it('recolors light neutrals by default and leaves dark and colored ones', async () => {
    await loadScript()
    expect(tone('#white')).toBe('base3')
    expect(tone('#gray')).toBe('base2')
    expect(tone('#black')).toBeNull()
    expect(tone('#blue')).toBeNull()
    expect(document.getElementById('solarize-extension-style')).not.toBeNull()
  })

  it('recolors dark neutrals when dark pages are on', async () => {
    store = {
      global_settings: globalWith({ lightEnabled: false, darkEnabled: true }),
    }
    await loadScript()
    expect(tone('#black')).toBe('base03')
    expect(tone('#white')).toBeNull()
  })

  it('recolors elements added later', async () => {
    await loadScript()
    const added = document.createElement('section')
    added.className = 'white'
    added.id = 'added'
    document.body.appendChild(added)
    await settle()
    expect(tone('#added')).toBe('base3')
  })

  it('reacts to a class change', async () => {
    await loadScript()
    document.getElementById('blue')!.className = 'white'
    await settle()
    expect(tone('#blue')).toBe('base3')
  })

  it('turns everything off with the global switch and back on', async () => {
    await loadScript()
    saveSettings({ global_settings: globalWith({ enabled: false }) })
    await settle()
    expect(document.querySelectorAll('[data-solarize]')).toHaveLength(0)
    expect(document.getElementById('solarize-extension-style')).toBeNull()

    saveSettings({ global_settings: globalWith({ enabled: true }) })
    await settle()
    expect(tone('#white')).toBe('base3')
  })

  it('stays off on a disabled site', async () => {
    store = { 'example.com': { enabled: false } }
    await loadScript()
    expect(document.querySelectorAll('[data-solarize]')).toHaveLength(0)
  })

  it('paints the canvas when neither html nor body has a background', async () => {
    document.body.innerHTML = '<p id="text">plain page</p>'
    await loadScript()
    expect(document.documentElement.getAttribute('data-solarize')).toBe('base3')
    expect(tone('#text')).toBeNull()
  })

  // Changes a stylesheet rule without touching the DOM, as a media query
  // flipping on an OS theme switch does
  const setRule = (selector: string, color: string) => {
    const sheet = document.querySelector<HTMLStyleElement>(
      'style:not(#solarize-extension-style)',
    )!.sheet!
    const rule = Array.from(sheet.cssRules).find(
      (r) => (r as CSSStyleRule).selectorText === selector,
    ) as CSSStyleRule
    rule.style.backgroundColor = color
  }

  it('recolors in place right away on an OS theme switch', async () => {
    store = { global_settings: globalWith({ darkEnabled: true }) }
    await loadScript()
    expect(tone('#white')).toBe('base3')
    setRule('.white', '#000000')
    themeListeners.forEach((fn) => fn())
    // No wait: the first batch runs inside the event
    expect(tone('#white')).toBe('base03')
  })

  it('reads the page again after the theme settles', async () => {
    store = { global_settings: globalWith({ darkEnabled: true }) }
    await loadScript()
    themeListeners.forEach((fn) => fn())
    // The site's own script switches its colors after the event
    setRule('.white', '#000000')
    await new Promise((resolve) => setTimeout(resolve, 200))
    expect(tone('#white')).toBe('base03')
  })

  it('catches up when a background tab is shown', async () => {
    store = { global_settings: globalWith({ darkEnabled: true }) }
    await loadScript()
    setRule('.white', '#000000')
    Object.defineProperty(document, 'visibilityState', {
      value: 'visible',
      configurable: true,
    })
    document.dispatchEvent(new Event('visibilitychange'))
    expect(tone('#white')).toBe('base03')
  })

  it('recolors when a site flips a theme attribute on <html>', async () => {
    store = { global_settings: globalWith({ darkEnabled: true }) }
    document.head.innerHTML =
      '<style>.card { background-color: #ffffff; } [data-theme="dark"] .card { background-color: #000000; }</style>'
    document.body.innerHTML = '<div class="card" id="card">card</div>'
    await loadScript()
    expect(tone('#card')).toBe('base3')
    document.documentElement.setAttribute('data-theme', 'dark')
    await settle()
    expect(tone('#card')).toBe('base03')
    document.documentElement.removeAttribute('data-theme')
  })

  it('marks its stylesheet so Dark Reader skips it, in a first layer', async () => {
    await loadScript()
    const style = document.getElementById('solarize-extension-style')!
    expect(style.classList.contains('stylus')).toBe(true)
    expect(style.textContent).toMatch(/^@layer solarize\{/)
    expect(style.textContent).toContain('[data-solarize="base03"]')
    // First in the document, so its layer is declared before any other
    expect(document.documentElement.firstElementChild).toBe(style)
  })

  // Dark Reader darkens a page by adding stylesheets after the OS switch
  const darkReaderStyle = () => {
    const style = document.createElement('style')
    style.className = 'darkreader darkreader--sync'
    style.textContent = '.white { background-color: #181a1b; }'
    return style
  }

  it('reads the page again once added stylesheets settle', async () => {
    store = { global_settings: globalWith({ darkEnabled: true }) }
    await loadScript()
    expect(tone('#white')).toBe('base3')
    // Like Dark Reader's sync copies, right after the stylesheet it overrides
    const style = darkReaderStyle()
    document
      .querySelector<HTMLStyleElement>('style:not(#solarize-extension-style)')!
      .after(style)
    await new Promise((resolve) => setTimeout(resolve, 150))
    expect(tone('#white')).toBe('base02')

    // Dark Reader turning off removes them again
    style.remove()
    await new Promise((resolve) => setTimeout(resolve, 150))
    expect(tone('#white')).toBe('base3')
  })

  it('reads the page again when a stylesheet is rewritten', async () => {
    store = { global_settings: globalWith({ darkEnabled: true }) }
    await loadScript()
    const style = document.createElement('style')
    style.textContent = '.gray { background-color: #ffffff; }'
    document
      .querySelector<HTMLStyleElement>('style:not(#solarize-extension-style)')!
      .after(style)
    await new Promise((resolve) => setTimeout(resolve, 150))
    style.textContent = '.gray { background-color: #000000; }'
    await new Promise((resolve) => setTimeout(resolve, 150))
    expect(tone('#gray')).toBe('base03')
  })

  it('pauses background transitions only while reading', async () => {
    document.body.innerHTML +=
      '<div id="pad" style="transition: width 0.15s, background 0.15s; background-color: #ffffff">pad</div>'
    await loadScript()
    expect(tone('#pad')).toBe('base3')
    expect(document.querySelectorAll('[data-solarize-reading]')).toHaveLength(0)
    expect(
      document.getElementById('solarize-extension-style')!.textContent,
    ).toContain('[data-solarize-reading]')
  })

  it('recolors a fade to white and leaves colorful gradients', async () => {
    document.head.innerHTML = `<style>
      .fade { background-image: linear-gradient(rgba(0, 0, 0, 0), rgb(255, 255, 255)); }
      .brand { background-image: linear-gradient(rgb(49, 134, 255), rgb(255, 255, 255)); }
    </style>`
    document.body.innerHTML =
      '<div class="fade" id="fade">fade</div><div class="brand" id="brand">brand</div><div class="fade" id="fade2">fade</div>'
    await loadScript()
    const id = document
      .getElementById('fade')!
      .getAttribute('data-solarize-gradient')
    expect(id).not.toBeNull()
    // Identical fades share one rule
    expect(
      document.getElementById('fade2')!.getAttribute('data-solarize-gradient'),
    ).toBe(id)
    expect(
      document.getElementById('brand')!.hasAttribute('data-solarize-gradient'),
    ).toBe(false)
    expect(
      document.getElementById('solarize-extension-style')!.textContent,
    ).toContain(
      `[data-solarize-gradient="${id}"]{background-image:linear-gradient(rgba(0, 0, 0, 0), rgb(253, 246, 227)) !important}`,
    )
  })
})
