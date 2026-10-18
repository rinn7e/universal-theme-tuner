// Theme Tuner: a panel with color knobs that previews the Solarized White
// themes live, then saves the values back to scripts/knobs.json and
// scripts/palettes.js and rebuilds the theme files.
//
// Live previews are written as theme-scoped overrides ("[Solarized White N]")
// in workbench.colorCustomizations and editor.tokenColorCustomizations; they
// only exist while tuning and are removed on close, reset and startup.
const vscode = require('vscode')
const fs = require('fs')
const path = require('path')

const scripts = path.join(__dirname, 'scripts')
const knobsPath = path.join(scripts, 'knobs.json')
const palettesPath = path.join(scripts, 'palettes.js')
const themeName = (id) => `Solarized White ${id}`
const isTunerKey = (key) => /^\[Solarized White \d+\]$/.test(key)

// Accent roles shown next to each knob
const roles = {
  green: 'keywords (import, from)',
  cyan: 'strings',
  blue: 'functions, variables',
  yellow: 'constants',
  orange: 'classes, types',
  red: 'regex, invalid',
  magenta: 'numbers',
  violet: 'inherited classes',
}

// Scripts are re-required so edits on disk (and saves) are picked up
const fresh = (file) => {
  delete require.cache[require.resolve(file)]
  return require(file)
}
// Rebuilds the theme files and palette.html from what is on disk now
const rebuild = () => {
  for (const f of ['palettes.js', 'theme.js', 'build.js', 'palette.js']) {
    delete require.cache[require.resolve(path.join(scripts, f))]
  }
  require(path.join(scripts, 'build.js'))
  require(path.join(scripts, 'palette.js'))
}
const loadKnobs = () => JSON.parse(fs.readFileSync(knobsPath, 'utf8'))
const loadPalettes = () => fresh(palettesPath).palettes
const loadSolarizedUi = () => fresh(palettesPath).solarizedUi
const loadMakeTheme = () => {
  fresh(palettesPath)
  return fresh(path.join(scripts, 'theme.js')).makeTheme
}

// The setting that picks the light theme: auto-detect uses the preferred light theme
const themeSettingKey = () =>
  vscode.workspace.getConfiguration('window').get('autoDetectColorScheme')
    ? 'preferredLightColorTheme'
    : 'colorTheme'

// The Solarized White theme in use, or null when another theme is active
const themeInUse = (ids) => {
  const name = vscode.workspace.getConfiguration('workbench').get(themeSettingKey())
  const m = /^Solarized White (\d+)$/.exec(name || '')
  return m && ids.includes(m[1]) ? m[1] : null
}

// Writes or removes this extension's overrides, leaving the user's own ones alone
const setOverrides = async (id, theme) => {
  const config = vscode.workspace.getConfiguration()
  const key = `[${themeName(id)}]`
  const colors = { ...(config.inspect('workbench.colorCustomizations').globalValue || {}) }
  const tokens = { ...(config.inspect('editor.tokenColorCustomizations').globalValue || {}) }
  if (theme) {
    colors[key] = theme.colors
    tokens[key] = { textMateRules: theme.tokenColors }
  } else {
    delete colors[key]
    delete tokens[key]
  }
  const g = vscode.ConfigurationTarget.Global
  await config.update('workbench.colorCustomizations', colors, g)
  await config.update('editor.tokenColorCustomizations', tokens, g)
}

const clearAllOverrides = async () => {
  const config = vscode.workspace.getConfiguration()
  const g = vscode.ConfigurationTarget.Global
  for (const setting of ['workbench.colorCustomizations', 'editor.tokenColorCustomizations']) {
    const value = config.inspect(setting).globalValue
    if (!value || !Object.keys(value).some(isTunerKey)) continue
    const kept = Object.fromEntries(Object.entries(value).filter(([k]) => !isTunerKey(k)))
    await config.update(setting, Object.keys(kept).length ? kept : undefined, g)
  }
}

// Rewrites one palette's hex values in palettes.js, keeping its comments
const savePalette = (id, palette) => {
  let src = fs.readFileSync(palettesPath, 'utf8')
  const head = `\n  ${id}: `
  const start = src.indexOf(head)
  if (start < 0) throw new Error(`palette ${id} not found in palettes.js`)
  const spread = `${head}{ ...solarized },`
  if (src.startsWith(spread, start)) {
    // Palette 1 is written as a spread of Solarized; spell it out to save it
    const lines = Object.entries(palette).map(([n, hex]) => `    ${n}: '${hex}',`)
    src = src.slice(0, start) + `${head}{\n${lines.join('\n')}\n  },` + src.slice(start + spread.length)
  } else {
    const end = src.indexOf('\n  },', start)
    const block = Object.entries(palette).reduce(
      (b, [n, hex]) => b.replace(new RegExp(`(\\n    ${n}: )'#[0-9A-Fa-f]{6}'`), `$1'${hex}'`),
      src.slice(start, end),
    )
    src = src.slice(0, start) + block + src.slice(end)
  }
  fs.writeFileSync(palettesPath, src)
}

const openTuner = (context) => {
  const panel = vscode.window.createWebviewPanel(
    'solarizedWhiteTuner',
    'Theme Tuner',
    vscode.ViewColumn.Beside,
    { enableScripts: true, retainContextWhenHidden: true },
  )
  let previewing = null // id with live overrides
  let saved = false

  const init = () => {
    const palettes = loadPalettes()
    const ids = Object.keys(palettes)
    const inUse = themeInUse(ids)
    panel.webview.postMessage({
      type: 'init',
      ids,
      current: inUse || ids[ids.length - 1],
      inUse: Boolean(inUse),
      knobs: loadKnobs(),
      palettes,
      solarizedUi: loadSolarizedUi(),
      roles,
    })
  }

  panel.webview.html = tunerHtml()
  panel.webview.onDidReceiveMessage(async (msg) => {
    try {
      if (msg.type === 'ready') init()
      if (msg.type === 'preview') {
        const theme = loadMakeTheme()(msg.knobs, msg.palette, themeName(msg.id), {
          solarizedUi: loadSolarizedUi().includes(msg.id),
        })
        if (previewing && previewing !== msg.id) await setOverrides(previewing, null)
        previewing = msg.id
        await setOverrides(msg.id, theme)
      }
      if (msg.type === 'use') {
        await vscode.workspace
          .getConfiguration('workbench')
          .update(themeSettingKey(), themeName(msg.id), vscode.ConfigurationTarget.Global)
      }
      if (msg.type === 'reset') {
        await clearAllOverrides()
        previewing = null
        init()
      }
      if (msg.type === 'save') {
        fs.writeFileSync(knobsPath, JSON.stringify(msg.knobs, null, 2) + '\n')
        savePalette(msg.id, msg.palette)
        rebuild()
        saved = true
        panel.webview.postMessage({ type: 'saved' })
      }
    } catch (e) {
      vscode.window.showErrorMessage(`Theme Tuner: ${e.message}`)
    }
  })

  panel.onDidDispose(async () => {
    await clearAllOverrides()
    // VS Code keeps the theme files it loaded at startup until a reload
    if (saved) {
      const pick = await vscode.window.showInformationMessage(
        'Theme Tuner: reload the window to load the saved themes.',
        'Reload Window',
      )
      if (pick) vscode.commands.executeCommand('workbench.action.reloadWindow')
    }
  })
  context.subscriptions.push(panel)
}

const tunerHtml = () => {
  const nonce = Math.random().toString(36).slice(2)
  return /* html */ `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src 'unsafe-inline'; script-src 'nonce-${nonce}';">
<meta name="viewport" content="width=device-width, initial-scale=1">
<style>
  body { font: 13px/1.5 var(--vscode-font-family); color: var(--vscode-foreground); padding: 8px 16px 24px; }
  h2 { font-size: 11px; text-transform: uppercase; letter-spacing: .06em; color: var(--vscode-descriptionForeground); margin: 20px 0 8px; }
  .row { display: grid; grid-template-columns: 34px 92px 1fr; align-items: center; gap: 8px; margin: 6px 0; }
  .row.range { grid-template-columns: 1fr 52px; }
  input[type=color] { width: 34px; height: 26px; padding: 0; border: 1px solid var(--vscode-input-border, transparent); border-radius: 4px; background: none; cursor: pointer; }
  input[type=text], select { font: 12px var(--vscode-editor-font-family); color: var(--vscode-input-foreground); background: var(--vscode-input-background); border: 1px solid var(--vscode-input-border, transparent); border-radius: 4px; padding: 3px 6px; }
  input[type=text] { width: 80px; }
  input[type=range] { width: 100%; }
  .label b { font-weight: 600; }
  .label span { color: var(--vscode-descriptionForeground); }
  .bar { display: flex; gap: 8px; align-items: center; flex-wrap: wrap; }
  button { font: inherit; padding: 4px 12px; border-radius: 4px; border: none; cursor: pointer;
    color: var(--vscode-button-foreground); background: var(--vscode-button-background); }
  button.secondary { color: var(--vscode-button-secondaryForeground); background: var(--vscode-button-secondaryBackground); }
  #solarized-note { color: var(--vscode-descriptionForeground); margin: 4px 0 8px; }
  #status { color: var(--vscode-descriptionForeground); min-height: 1.5em; margin-top: 12px; }
</style>
</head>
<body>
  <div class="bar">
    <select id="theme" aria-label="Theme"></select>
    <button class="secondary" id="use">Use this theme</button>
  </div>
  <h2>Surfaces &amp; text</h2>
  <p id="solarized-note" hidden>Solarized Light's own tones: each knob recolors everywhere Solarized uses it.</p>
  <div id="knobs"></div>
  <h2>Syntax</h2>
  <div id="accents"></div>
  <div class="bar" style="margin-top:20px">
    <button id="save">Save</button>
    <button class="secondary" id="reset">Reset</button>
  </div>
  <div id="status"></div>
<script nonce="${nonce}">
  const vscode = acquireVsCodeApi()
  const $ = (id) => document.getElementById(id)
  let state = null
  let timer = null

  const knobLabels = {
    bg: ['Background', 'sidebar, bars, panels'],
    text: ['UI text', 'file names, tabs, menus'],
    textMuted: ['Comments', 'and blame, secondary text'],
  }
  // Knobs for themes that keep Solarized Light's UI (knobs.solarizedUi)
  const solarizedLabels = {
    editor: ['Editor', 'editor, active tab, terminal'],
    surface: ['Surface', 'sidebar, title and status bars, line highlight'],
    border: ['Borders', 'borders, activity bar, inputs'],
    tabBar: ['Tab bar', 'tab strip'],
    inactiveTab: ['Inactive tab', 'inactive tabs'],
    text: ['Code text', 'editor text, cursor'],
    uiText: ['UI text', 'sidebar titles, inputs, bold const'],
    comments: ['Comments', 'and tag brackets'],
  }

  const colorRow = (label, note, value, onChange) => {
    const row = document.createElement('div')
    row.className = 'row'
    row.innerHTML = '<input type="color"><input type="text" spellcheck="false"><div class="label"><b></b> <span></span></div>'
    const [picker, text] = row.querySelectorAll('input')
    row.querySelector('b').textContent = label
    row.querySelector('span').textContent = note
    picker.value = value.toLowerCase()
    text.value = value.toUpperCase()
    picker.addEventListener('input', () => { text.value = picker.value.toUpperCase(); onChange(text.value) })
    text.addEventListener('input', () => {
      if (/^#[0-9a-f]{6}$/i.test(text.value)) { picker.value = text.value.toLowerCase(); onChange(text.value.toUpperCase()) }
    })
    return row
  }

  const render = () => {
    const ownUi = state.solarizedUi.includes(state.id)
    $('solarized-note').hidden = !ownUi
    const k = $('knobs'); k.innerHTML = ''
    if (ownUi) {
      const tones = state.knobs.solarizedUi
      for (const key of Object.keys(solarizedLabels)) {
        k.append(colorRow(solarizedLabels[key][0], solarizedLabels[key][1], tones[key], (v) => { tones[key] = v; changed() }))
      }
    } else {
      for (const key of ['bg', 'text', 'textMuted']) {
        k.append(colorRow(knobLabels[key][0], knobLabels[key][1], state.knobs[key], (v) => { state.knobs[key] = v; changed() }))
      }
      const step = document.createElement('div')
      step.innerHTML = '<div class="label"><b>Editor darkness</b> <span>how much darker the editor is than the background</span></div><div class="row range"><input type="range" min="0" max="0.9" step="0.001"><code></code></div>'
      const range = step.querySelector('input'), out = step.querySelector('code')
      range.value = state.knobs.editorStep; out.textContent = state.knobs.editorStep
      range.addEventListener('input', () => { state.knobs.editorStep = Number(range.value); out.textContent = range.value; changed() })
      k.append(step)
    }

    const a = $('accents'); a.innerHTML = ''
    const palette = state.palettes[state.id]
    for (const name of Object.keys(state.roles)) {
      a.append(colorRow(name, state.roles[name], palette[name], (v) => { palette[name] = v; changed() }))
    }
  }

  const changed = () => {
    $('status').textContent = 'Previewing (unsaved)'
    clearTimeout(timer)
    timer = setTimeout(() => vscode.postMessage({ type: 'preview', id: state.id, knobs: state.knobs, palette: state.palettes[state.id] }), 60)
  }

  $('theme').addEventListener('change', () => { state.id = $('theme').value; render() })
  $('use').addEventListener('click', () => { vscode.postMessage({ type: 'use', id: state.id }); $('status').textContent = 'Switched to Solarized White ' + state.id })
  $('save').addEventListener('click', () => { vscode.postMessage({ type: 'save', id: state.id, knobs: state.knobs, palette: state.palettes[state.id] }); $('status').textContent = 'Saving…' })
  $('reset').addEventListener('click', () => vscode.postMessage({ type: 'reset' }))

  window.addEventListener('message', ({ data }) => {
    if (data.type === 'init') {
      state = { ...data, id: data.current }
      $('theme').innerHTML = data.ids.map((id) => '<option value="' + id + '">Solarized White ' + id + '</option>').join('')
      $('theme').value = state.id
      render()
      $('status').textContent = data.inUse
        ? 'Editing Solarized White ' + state.id + ' (the theme in use)'
        : 'Another theme is active: press "Use this theme" to see the preview'
    }
    if (data.type === 'saved') $('status').textContent = 'Saved to knobs.json and palettes.js, themes rebuilt. Close the panel and reload to load them.'
  })
  vscode.postMessage({ type: 'ready' })
</script>
</body>
</html>`
}

const activate = (context) => {
  // Remove previews left behind if VS Code quit while tuning
  clearAllOverrides()
  context.subscriptions.push(
    vscode.commands.registerCommand('solarizedWhite.tune', () => openTuner(context)),
  )
}

module.exports = { activate, deactivate: () => {} }
