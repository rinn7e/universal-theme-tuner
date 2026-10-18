/*
 * Copyright (C) 2026 Moremi Vannak
 * SPDX-License-Identifier: GPL-3.0-only
 */
import React from 'react'
import { type Dispatcher } from 'tea-cup-fp'

import { formatDateTime } from './common/date-util'
import { BUILD_DATE, SHOW_BUILD_DATE } from './common/env'
import { DARK_TONES, LIGHT_TONES } from './common/solarized'
import { type Model, type Msg } from './type'
import { MAX_FONT_SIZE, MIN_FONT_SIZE } from './update'

export interface AppProps {
  model: Model
  dispatch: Dispatcher<Msg>
}

const toggleSwitchView = (
  isEnabled: boolean,
  onToggle: () => void,
  size: 'small' | 'big' = 'small',
  title?: string,
) => {
  const isBig = size === 'big'
  return (
    <button
      type='button'
      onClick={onToggle}
      aria-pressed={isEnabled}
      className={`relative shrink-0 cursor-pointer border transition-colors duration-200 ease-in-out focus:outline-none ${
        isBig ? 'h-[20px] w-[36px]' : 'h-[16px] w-[28px]'
      } ${
        isEnabled
          ? 'bg-theme-primary border-transparent'
          : 'bg-theme-bg-input border-theme-border-input'
      }`}
      title={title}
    >
      <span
        className={`pointer-events-none absolute top-[1px] left-[1px] bg-white shadow-sm transition-transform duration-200 ease-in-out ${
          isBig ? 'h-[16px] w-[16px]' : 'h-[12px] w-[12px]'
        } ${
          isEnabled
            ? isBig
              ? 'translate-x-[16px]'
              : 'translate-x-[12px]'
            : 'translate-x-[0px]'
        }`}
      />
    </button>
  )
}

const headerView = (model: Model, dispatch: Dispatcher<Msg>) => {
  const isEnabled = model.global.enabled
  const version =
    typeof chrome !== 'undefined' && chrome.runtime?.getManifest
      ? `v${chrome.runtime.getManifest().version}`
      : 'version unknown'
  const buildTimeStr =
    SHOW_BUILD_DATE && BUILD_DATE
      ? `build: ${formatDateTime(new Date(BUILD_DATE))}`
      : ''
  return (
    <div className='border-theme-border-card flex items-center justify-between border-b px-[16px] pt-[14px] pb-[12px]'>
      <div className='flex flex-col gap-[4px]'>
        <h1 className='text-theme-primary flex items-baseline gap-[6px] text-base leading-none font-semibold tracking-tight'>
          <span>Solarize</span>
          <span className='text-theme-text-dim text-[0.8125rem] leading-none font-normal'>
            {version}
          </span>
        </h1>
        {buildTimeStr && (
          <span className='text-theme-text-dim text-[0.8125rem] leading-none'>
            {buildTimeStr}
          </span>
        )}
      </div>
      {toggleSwitchView(
        isEnabled,
        () => dispatch({ _tag: 'ToggleGlobalEnabled' }),
        'big',
        isEnabled ? 'Turn Solarize off everywhere' : 'Turn Solarize on',
      )}
    </div>
  )
}

const siteRowView = (model: Model, dispatch: Dispatcher<Msg>) => (
  <div className='bg-theme-bg-card border-theme-border-card flex items-center justify-between gap-[8px] border px-[12px] py-[8px]'>
    <div className='flex min-w-0 flex-col gap-[2px]'>
      <span className='text-theme-text-dim text-[0.75rem] font-semibold tracking-wider uppercase'>
        This site
      </span>
      <span
        title={model.hostname}
        className='text-theme-text-main truncate font-mono text-[0.8125rem]'
      >
        {model.isSystemPage ? 'Browser page (not supported)' : model.hostname}
      </span>
    </div>
    {!model.isSystemPage &&
      toggleSwitchView(
        model.site.enabled,
        () => dispatch({ _tag: 'ToggleSiteEnabled' }),
        'small',
        model.site.enabled ? 'Turn off on this site' : 'Turn on for this site',
      )}
  </div>
)

const swatchesView = (colors: string[]) => (
  <div className='flex gap-[4px]'>
    {colors.map((color) => (
      <span
        key={color}
        title={color}
        className='border-theme-border-card h-[14px] w-[22px] border'
        style={{ backgroundColor: color }}
      />
    ))}
  </div>
)

interface ModeCardConfig {
  title: string
  description: string
  enabled: boolean
  colors: string[]
  onToggle: () => Msg
}

const modeCardView = (config: ModeCardConfig, dispatch: Dispatcher<Msg>) => (
  <div className='bg-theme-bg-card border-theme-border-card flex flex-col gap-[8px] border px-[12px] py-[10px]'>
    <div className='flex items-center justify-between gap-[8px]'>
      <span className='text-theme-text-main text-[0.875rem] font-semibold'>
        {config.title}
      </span>
      {toggleSwitchView(config.enabled, () => dispatch(config.onToggle()))}
    </div>
    <span className='text-theme-text-muted text-[0.75rem] leading-snug'>
      {config.description}
    </span>
    {swatchesView(config.colors)}
  </div>
)

const footerView = (fontSize: number, dispatch: Dispatcher<Msg>) => (
  <div className='border-theme-border-card text-theme-text-dim flex items-center justify-between border-t px-[16px] py-[10px] text-[0.75rem]'>
    <span>Light on light pages, dark on dark</span>
    <div className='flex items-center gap-[4px] font-semibold select-none'>
      <button
        type='button'
        onClick={() =>
          dispatch({ _tag: 'SetFontSize', fontSize: fontSize - 1 })
        }
        disabled={fontSize <= MIN_FONT_SIZE}
        className='hover:text-theme-primary cursor-pointer px-[4px] disabled:cursor-not-allowed disabled:opacity-40'
        title='Decrease font size'
      >
        A-
      </button>
      <button
        type='button'
        onClick={() =>
          dispatch({ _tag: 'SetFontSize', fontSize: fontSize + 1 })
        }
        disabled={fontSize >= MAX_FONT_SIZE}
        className='hover:text-theme-primary cursor-pointer px-[4px] disabled:cursor-not-allowed disabled:opacity-40'
        title='Increase font size'
      >
        A+
      </button>
    </div>
  </div>
)

export const App = ({ model, dispatch }: AppProps) => (
  <div className='bg-theme-secondary text-theme-text-main flex flex-col select-none'>
    {headerView(model, dispatch)}
    <div
      className={`flex flex-col gap-[10px] px-[16px] py-[12px] transition-opacity duration-200 ${
        model.global.enabled ? 'opacity-100' : 'pointer-events-none opacity-40'
      }`}
    >
      {siteRowView(model, dispatch)}
      {modeCardView(
        {
          title: 'Light pages',
          description:
            'White and light-gray backgrounds become Solarized Light.',
          enabled: model.global.lightEnabled,
          colors: Object.values(LIGHT_TONES),
          onToggle: () => ({ _tag: 'ToggleLightEnabled' }),
        },
        dispatch,
      )}
      {modeCardView(
        {
          title: 'Dark pages',
          description: 'Black and dark-gray backgrounds become Solarized Dark.',
          enabled: model.global.darkEnabled,
          colors: Object.values(DARK_TONES),
          onToggle: () => ({ _tag: 'ToggleDarkEnabled' }),
        },
        dispatch,
      )}
    </div>
    {footerView(model.global.fontSize, dispatch)}
  </div>
)
