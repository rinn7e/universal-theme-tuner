/*
 * Copyright (C) 2026 Moremi Vannak
 * SPDX-License-Identifier: GPL-3.0-only
 */
// @vitest-environment jsdom
import { describe, expect, it, vi } from 'vitest'

import { SHADOW_EVENT } from '../src/common/shadow'

describe('shadow hook', () => {
  it('announces each attached shadow root on its host, after the attach', async () => {
    await import('../src/worker/shadow-hook')
    const host = document.createElement('div')
    document.body.appendChild(host)
    const seen: EventTarget[] = []
    document.addEventListener(SHADOW_EVENT, (e) => seen.push(e.target!), true)

    const root = host.attachShadow({ mode: 'closed' })
    expect(root).toBeInstanceOf(ShadowRoot)
    expect(seen).toHaveLength(0)
    await Promise.resolve()
    expect(seen).toEqual([host])
  })

  it('wraps attachShadow only once', async () => {
    await import('../src/worker/shadow-hook')
    const first = Element.prototype.attachShadow
    // A second copy (another frame load, a reinjection) leaves it alone
    vi.resetModules()
    await import('../src/worker/shadow-hook')
    expect(Element.prototype.attachShadow).toBe(first)
  })
})
