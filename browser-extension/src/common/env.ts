/*
 * Copyright (C) 2026 Moremi Vannak
 * SPDX-License-Identifier: GPL-3.0-only
 */

export const DEFAULT_FONT_SIZE: number =
  Number(import.meta.env.VITE_DEFAULT_FONT_SIZE) || 16

export const DISABLE_LOG: boolean = import.meta.env.VITE_DISABLE_LOG === 'true'

export const BUILD_DATE: string | undefined = import.meta.env.VITE_BUILD_DATE

export const SHOW_BUILD_DATE: boolean =
  import.meta.env.VITE_SHOW_BUILD_DATE === 'true'
