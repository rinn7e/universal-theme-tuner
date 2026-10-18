/*
 * Copyright (C) 2026 Moremi Vannak
 * SPDX-License-Identifier: MIT
 */

// Fired on a host right after the page attaches a shadow root to it, by the
// main-world hook (worker/shadow-hook.ts), so the content script can reach
// shadow roots that appear without any DOM change it could observe
export const SHADOW_EVENT = 'solarize:shadow-attached'
