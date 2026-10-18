/*
 * Copyright (C) 2026 Moremi Vannak
 * SPDX-License-Identifier: MIT
 */
import React from 'react'
import { ProgramWithNav } from 'react-tea-cup'
import { type Dispatcher, Sub } from 'tea-cup-fp'

import { App } from './app'
import { type Model, type Msg } from './type'
import { init, update } from './update'

const preLoadingView = () => (
  <div className='bg-theme-secondary flex h-[180px] w-[320px] items-center justify-center select-none'>
    <div className='border-theme-bg-input border-t-theme-primary h-8 w-8 animate-spin rounded-full border-4' />
  </div>
)

const preView = (dispatch: Dispatcher<Msg>, model: Model | null) =>
  model ? <App model={model} dispatch={dispatch} /> : preLoadingView()

export const AppProgram = () => (
  <ProgramWithNav<Model | null, Msg>
    onUrlChange={() => ({ _tag: 'NoOp' })}
    init={init}
    update={update}
    view={preView}
    subscriptions={() => Sub.none()}
  />
)
