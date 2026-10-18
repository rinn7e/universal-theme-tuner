/*
 * Copyright (C) 2026 Moremi Vannak
 * SPDX-License-Identifier: GPL-3.0-only
 */
import {
  type Modes,
  TONE_COLORS,
  type Tone,
  animatesBackground,
  recolorGradient,
  toneFor,
} from '../common/solarized'
import {
  GLOBAL_SETTINGS_KEY,
  GlobalSettingCodec,
  SiteSettingCodec,
  activeModes,
  decodeOr,
  defaultGlobalSetting,
  defaultSiteSetting,
} from '../common/type/settings'

// Elements whose background is swapped carry this attribute with the tone;
// one stylesheet maps each tone to its color
const ATTR = 'data-solarize'
const STYLE_ID = 'solarize-extension-style'

// Set for an instant while reading an element whose background animates
// (Damn Center's pads fade in): it pauses transitions so the read gives the
// color the page is heading to, not a frame of the fade
const READING_ATTR = 'data-solarize-reading'

// Elements whose background-image is a neutral gradient (a fade to white)
// carry this attribute; each distinct recolored gradient gets one rule
const GRADIENT_ATTR = 'data-solarize-gradient'

// Elements recolored per batch; each batch strips, reads, then writes so the
// browser recalculates styles once per batch instead of once per element
const BATCH_SIZE = 300

// Time a run may take before yielding to the page
const RUN_BUDGET_MS = 12

// Delay before reading the page again after an OS theme switch, for sites
// whose own scripts react to the switch after us (Damn Center uses the same)
const THEME_SETTLE_MS = 150

// Quiet time after the last stylesheet change before reading the page again,
// so a burst of new stylesheets (Dark Reader adds many) costs one scan
const RESTYLE_SETTLE_MS = 100

// Our rules live in a cascade layer declared before any other: !important
// declarations in a layer beat unlayered ones whatever their specificity, and
// among layers the first declared wins. That puts them above site rules and
// Dark Reader, whose <html> color sits in its own anonymous layer
const LAYER = 'solarize'

let modes: Modes = { light: false, dark: false }
let observer: MutationObserver | null = null
// Watches every attribute on <html> and <body>, where sites flip their theme
// (class, data-theme, data-color-mode, ...)
let themeObserver: MutationObserver | null = null
let observedBody = false
const pending = new Set<Element>()
let scheduled = false
let restyleTimer: ReturnType<typeof setTimeout> | undefined
// Recolored gradient -> its rule's id, so identical fades share one rule
const gradientIds = new Map<string, string>()

const isOn = () => modes.light || modes.dark

const ensureStyle = () => {
  if (document.getElementById(STYLE_ID)) return
  const style = document.createElement('style')
  style.id = STYLE_ID
  // Dark Reader leaves stylesheets with this class alone (its courtesy to the
  // Stylus extension), so it neither rewrites nor removes our colors
  style.className = 'stylus'
  const rules = [
    ...Object.entries(TONE_COLORS).map(
      ([tone, color]) =>
        `[${ATTR}="${tone}"]{background-color:${color} !important}`,
    ),
    `[${READING_ATTR}]{transition:none !important}`,
  ]
  style.textContent = `@layer ${LAYER}{\n${rules.join('\n')}\n}`
  // First in the document, so our layer is declared before any other
  // (<head> may not exist yet at document_start)
  document.documentElement.prepend(style)
}

const removeStyle = () => {
  document.getElementById(STYLE_ID)?.remove()
  gradientIds.clear()
}

// The id of the rule painting this recolored gradient, adding the rule to
// our layer the first time
const gradientId = (gradient: string): string => {
  const known = gradientIds.get(gradient)
  if (known) return known
  const id = `g${gradientIds.size}`
  gradientIds.set(gradient, id)
  const style = document.getElementById(STYLE_ID)
  if (style) {
    style.textContent += `\n@layer ${LAYER}{[${GRADIENT_ATTR}="${id}"]{background-image:${gradient} !important}}`
  }
  return id
}

const queueTree = (root: Element) => {
  pending.add(root)
  const all = root.getElementsByTagName('*')
  for (let i = 0; i < all.length; i++) pending.add(all[i])
  schedule()
}

const schedule = () => {
  if (scheduled) return
  scheduled = true
  setTimeout(run, 0)
}

const isTransparent = (value: string) =>
  value === 'transparent' ||
  /^rgba\(.*,\s*0\)$/.test(value) ||
  / \/ 0\)$/.test(value)

// With no background on <html> or <body>, the browser paints the canvas:
// white, or dark when the page opts into a dark color-scheme
const canvasTone = (html: string, body: string | null): Tone | null => {
  if (!isTransparent(html) || (body !== null && !isTransparent(body)))
    return null
  const scheme = getComputedStyle(document.documentElement).colorScheme
  const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches
  const dark =
    scheme.includes('dark') && (!scheme.includes('light') || prefersDark)
  if (dark) return modes.dark ? 'base03' : null
  return modes.light ? 'base3' : null
}

const recolorBatch = (batch: Element[]) => {
  // 1. Find the elements whose background animates
  const animated = batch.filter((el) => {
    const style = getComputedStyle(el)
    return animatesBackground(
      style.transitionProperty,
      style.transitionDuration,
    )
  })
  // 2. Strip earlier tags so the page's own colors are read, and pause the
  // animated ones so they read as their final color
  batch.forEach((el) => {
    el.removeAttribute(ATTR)
    el.removeAttribute(GRADIENT_ATTR)
  })
  animated.forEach((el) => el.setAttribute(READING_ATTR, ''))
  // 3. Read every background before writing anything
  const styles = batch.map((el) => getComputedStyle(el))
  const backgrounds = styles.map((style) => style.backgroundColor)
  const images = styles.map((style) => style.backgroundImage)
  const root = document.documentElement
  const bodyBackground =
    batch.includes(root) && document.body
      ? getComputedStyle(document.body).backgroundColor
      : null
  // 4. Write
  animated.forEach((el) => el.removeAttribute(READING_ATTR))
  batch.forEach((el, i) => {
    const tone =
      el === root
        ? (toneFor(backgrounds[i], modes) ??
          canvasTone(backgrounds[i], bodyBackground))
        : toneFor(backgrounds[i], modes)
    if (tone) el.setAttribute(ATTR, tone)
    const gradient = recolorGradient(images[i], modes)
    if (gradient) el.setAttribute(GRADIENT_ATTR, gradientId(gradient))
  })
}

const run = () => {
  scheduled = false
  if (!isOn()) {
    pending.clear()
    return
  }
  const deadline = performance.now() + RUN_BUDGET_MS
  while (pending.size > 0 && performance.now() < deadline) {
    const batch: Element[] = []
    for (const el of pending) {
      pending.delete(el)
      if (el.isConnected) batch.push(el)
      if (batch.length >= BATCH_SIZE) break
    }
    recolorBatch(batch)
  }
  if (pending.size > 0) schedule()
}

// A page stylesheet (not ours): adding, removing or rewriting one can change
// any element's background, as Dark Reader does when it turns on or off
const isStyleSheet = (node: Node) =>
  node instanceof HTMLStyleElement
    ? node.id !== STYLE_ID
    : node instanceof HTMLLinkElement &&
      node.rel.toLowerCase().includes('stylesheet')

const onMutations = (mutations: MutationRecord[]) => {
  let restyled = false
  for (const mutation of mutations) {
    if (mutation.type === 'childList') {
      mutation.addedNodes.forEach((node) => {
        if (node instanceof Element) queueTree(node)
        if (isStyleSheet(node)) restyled = true
      })
      mutation.removedNodes.forEach((node) => {
        if (isStyleSheet(node)) restyled = true
      })
      // Text written into an existing <style>
      if (isStyleSheet(mutation.target)) restyled = true
    } else if (mutation.target instanceof Element) {
      // A class or style change can recolor the element and its children
      queueTree(mutation.target)
    }
  }
  // <body> arriving or changing can change the canvas, decided on <html>
  pending.add(document.documentElement)
  schedule()
  if (restyled) restyleSoon()
}

// Reads the whole page again, recoloring in place: the first batch runs now
// so the switch shows on the next frame, the rest follows in later runs
const rescan = () => {
  if (!isOn()) return
  queueTree(document.documentElement)
  run()
}

// Reads the whole page once stylesheet changes go quiet
const restyleSoon = () => {
  clearTimeout(restyleTimer)
  restyleTimer = setTimeout(rescan, RESTYLE_SETTLE_MS)
}

const onThemeMutations = (mutations: MutationRecord[]) => {
  const ours = [ATTR, READING_ATTR, GRADIENT_ATTR]
  if (mutations.some((m) => !ours.includes(m.attributeName ?? ''))) rescan()
}

const observeTheme = () => {
  themeObserver?.observe(document.documentElement, { attributes: true })
  if (document.body) themeObserver?.observe(document.body, { attributes: true })
}

const startObserving = () => {
  if (observer) return
  observer = new MutationObserver((mutations) => {
    // <body> arrives after document_start; watch its attributes too
    if (document.body && !observedBody) {
      observedBody = true
      observeTheme()
    }
    onMutations(mutations)
  })
  observer.observe(document.documentElement, {
    childList: true,
    subtree: true,
    attributes: true,
    attributeFilter: ['class', 'style'],
  })
  themeObserver = new MutationObserver(onThemeMutations)
  observedBody = Boolean(document.body)
  observeTheme()
}

const stopObserving = () => {
  observer?.disconnect()
  observer = null
  themeObserver?.disconnect()
  themeObserver = null
  clearTimeout(restyleTimer)
}

const clearAll = () => {
  pending.clear()
  document.querySelectorAll(`[${ATTR}], [${GRADIENT_ATTR}]`).forEach((el) => {
    el.removeAttribute(ATTR)
    el.removeAttribute(GRADIENT_ATTR)
  })
}

export const apply = (next: Modes) => {
  modes = next
  clearAll()
  if (isOn()) {
    ensureStyle()
    startObserving()
    queueTree(document.documentElement)
  } else {
    stopObserving()
    removeStyle()
  }
}

const loadAndApply = () => {
  const hostname = window.location.hostname
  if (typeof chrome === 'undefined' || !chrome.storage?.local) {
    apply(activeModes(defaultGlobalSetting, defaultSiteSetting))
    return
  }
  chrome.storage.local.get([GLOBAL_SETTINGS_KEY, hostname], (res) => {
    const global = decodeOr(
      GlobalSettingCodec,
      res[GLOBAL_SETTINGS_KEY],
      defaultGlobalSetting,
    )
    const site = decodeOr(SiteSettingCodec, res[hostname], defaultSiteSetting)
    apply(activeModes(global, site))
  })
}

if (typeof chrome !== 'undefined' && chrome.storage?.onChanged) {
  chrome.storage.onChanged.addListener((changes, area) => {
    const hostname = window.location.hostname
    if (
      area === 'local' &&
      (GLOBAL_SETTINGS_KEY in changes || hostname in changes)
    ) {
      loadAndApply()
    }
  })
}

// Sites that follow the OS theme swap their colors: read them again right
// away, in place so nothing flashes, and once more after their own scripts
window
  .matchMedia('(prefers-color-scheme: dark)')
  .addEventListener('change', () => {
    rescan()
    setTimeout(rescan, THEME_SETTLE_MS)
  })

// A <link> stylesheet applies when it loads, after it was added; load
// events don't bubble, so listen in the capture phase
document.addEventListener(
  'load',
  (event) => {
    if (event.target instanceof Node && isStyleSheet(event.target)) {
      restyleSoon()
    }
  },
  true,
)

// Timers are throttled in background tabs, so a switch made while the tab
// was hidden may still be catching up; finish it when the tab is shown
document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'visible') rescan()
})

loadAndApply()
