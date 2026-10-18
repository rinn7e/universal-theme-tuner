/*
 * Copyright (C) 2026 Moremi Vannak
 * SPDX-License-Identifier: MIT
 */
import { SHADOW_EVENT } from '../common/shadow'

// Runs in the page's own world, before its scripts: wraps attachShadow so
// the content script hears about every shadow root, open or closed, even one
// attached to an element already on the page (a web component upgrading in
// place), which no DOM observer can see

type Patched = typeof Element.prototype.attachShadow & { solarize?: true }

if (!(Element.prototype.attachShadow as Patched).solarize) {
  const attachShadow = Element.prototype.attachShadow
  const patched: Patched = function (this: Element, init: ShadowRootInit) {
    const root = attachShadow.call(this, init)
    // After the component has had its turn to fill the root in
    queueMicrotask(() =>
      this.dispatchEvent(
        new Event(SHADOW_EVENT, { bubbles: true, composed: true }),
      ),
    )
    return root
  }
  patched.solarize = true
  Element.prototype.attachShadow = patched
}
