// Turns knobs (knobs.json) and a syntax palette (palettes.js) into a theme:
// - syntax (tokenColors) from VS Code's Solarized Light (MIT, Microsoft, see
//   LICENSE-vscode), with its accents
//   swapped for the palette's shades (palette 1 = unchanged)
// - UI colors: cream panels in the style of the Claude desktop app
// solarizedUi themes keep Solarized Light's own UI instead, and groovyLambda
// themes are Groovy Lambda's, each with its tones swapped for the knobs (see
// makeTheme)
// Pure: used by build.js to write the theme files and by the tuner for live previews
const fs = require('fs')
const path = require('path')
const { solarized } = require('./palettes')

const readUpstream = (file) => JSON.parse(fs.readFileSync(path.join(__dirname, file), 'utf8'))
const upstream = readUpstream('solarized-light-upstream.json')
// Groovy Lambda (github.com/sheaf/groovy-lambda, MIT, see
// LICENSE-groovy-lambda), the base of the groovyLambda themes
const groovyUpstream = readUpstream('groovy-lambda-upstream.json')

// Darken a color by a fraction, keeping its tint
const shade = (hex, amount) =>
  '#' +
  [1, 3, 5]
    .map((i) => Math.round(parseInt(hex.slice(i, i + 2), 16) * (1 - amount)))
    .map((v) => v.toString(16).padStart(2, '0'))
    .join('')
    .toUpperCase()

// Solarized Light's surface and text tones, tunable for solarizedUi themes
// (knobs.solarizedUi); each replaces that color wherever Solarized Light uses it
const solarizedTones = {
  editor: '#FDF6E3', // editor, active tab, terminal
  surface: '#EEE8D5', // sidebar, title and status bars, widgets, line highlight
  border: '#DDD6C1', // borders, activity bar, inputs
  tabBar: '#D9D2C2', // tab strip
  inactiveTab: '#D3CBB7', // inactive tabs
  text: '#657B83', // editor text, cursor
  uiText: '#586E75', // sidebar titles, inputs, bold storage keywords
  comments: '#93A1A1', // comments, tag brackets
}

// Groovy Lambda's background and panel tones, tunable for groovyLambda themes
// (knobs.groovyLambda): each knob replaces that color wherever Groovy Lambda
// uses it
const groovyTones = {
  background: '#292828', // editor, sidebar, bars, panels, inputs
  widget: '#32302F', // hover widget, peek view, menu selection
  lineHighlight: '#383432', // current line, suggest widget
  raised: '#3C3836', // peek title, word highlight, status bar hover
  border: '#45403D', // dropdown border, suggest selection, whitespace
}

// Swaps a color through a hex map, keeping any alpha suffix
const recolor = (value, map) => {
  const hex = value.slice(0, 7)
  const to = map.get(hex.toUpperCase())
  // Unchanged tones keep their original spelling (Solarized mixes upper/lower case)
  return to && to !== hex.toUpperCase() ? to + value.slice(7) : value
}

// Solarized Light's syntax rules with each accent swapped for the palette's shade
const syntaxFor = (palette) => {
  const swap = new Map(Object.entries(solarized).map(([name, hex]) => [hex, palette[name]]))
  // Always copies, so per-theme tweaks (comment color) never touch the shared upstream rules
  return upstream.tokenColors.map((t) => {
    const fg = t.settings && t.settings.foreground
    const to = fg && swap.get(fg.toUpperCase())
    return { ...t, settings: { ...t.settings, ...(to && { foreground: to }) } }
  })
}

const makeColors = (knobs) => {
  // Solarized accents (used for UI highlights, not just syntax)
  const sol = {
    base01: '#586E75',
    base00: '#657B83',
    base1: '#93A1A1',
    yellow: '#B58900',
    orange: '#CB4B16',
    red: '#DC322F',
    magenta: '#D33682',
    violet: '#6C71C4',
    blue: '#268BD2',
    cyan: '#2AA198',
    green: '#859900',
  }

  // Neutral UI palette
  // Every background; the shades below are derived from it
  // (knobs.bg #FAF7F2: halfway between the earlier cream #F7F3E9 and Claude desktop's #FCFBFA)
  const bg = knobs.bg
  // Editor area: darker than bg by knobs.editorStep
  // (0.022: the same step as Claude desktop's terminal vs its main view)
  const editorBg = shade(bg, knobs.editorStep)

  const ui = {
    white: '#FFFFFF', // text on dark buttons and badges
    bg, // panels, widgets, bars
    editor: editorBg, // text editor area and its active tab
    tabBar: shade(bg, 0.05), // tab strip and inactive tabs, darker than the editor
    hover: shade(bg, 0.03),
    selected: shade(bg, 0.06),
    border: shade(bg, 0.06),
    borderStrong: shade(bg, 0.12),
    text: knobs.text,
    textMuted: knobs.textMuted,
    textFaint: '#B4B4AF',
    accent: sol.blue,
    claude: '#D97757', // badges, modified markers
  }

  const colors = {
    // Base
    foreground: ui.text,
    descriptionForeground: ui.textMuted,
    disabledForeground: ui.textFaint,
    focusBorder: ui.accent + '99',
    'widget.border': ui.border,
    'widget.shadow': '#0000000F',
    'selection.background': sol.blue + '33',
    'textLink.foreground': ui.accent,
    'textLink.activeForeground': ui.accent,
    'icon.foreground': ui.textMuted,
    'sash.hoverBorder': ui.accent + '66',

    // Title bar
    'titleBar.activeBackground': ui.bg,
    'titleBar.activeForeground': ui.text,
    'titleBar.inactiveBackground': ui.bg,
    'titleBar.inactiveForeground': ui.textMuted,
    'titleBar.border': ui.border,
    'commandCenter.background': ui.bg,
    'commandCenter.border': ui.border,
    'commandCenter.activeBackground': ui.hover,

    // Activity bar
    'activityBar.background': ui.bg,
    'activityBar.foreground': ui.text,
    'activityBar.inactiveForeground': ui.textFaint,
    'activityBar.border': ui.border,
    'activityBar.activeBorder': ui.text,
    'activityBarBadge.background': ui.claude,
    'activityBarBadge.foreground': ui.white,

    // Side bar
    'sideBar.background': ui.bg,
    'sideBar.foreground': ui.text,
    'sideBar.border': ui.border,
    'sideBarTitle.foreground': ui.text,
    'sideBarSectionHeader.background': ui.bg,
    'sideBarSectionHeader.foreground': ui.text,
    'sideBarSectionHeader.border': ui.border,

    // Lists / trees
    'list.hoverBackground': ui.hover,
    'list.activeSelectionBackground': ui.selected,
    'list.activeSelectionForeground': ui.text,
    'list.inactiveSelectionBackground': ui.selected,
    'list.inactiveSelectionForeground': ui.text,
    'list.focusOutline': '#00000000',
    'list.focusBackground': ui.selected,
    'list.highlightForeground': sol.yellow,
    'list.dropBackground': sol.blue + '1A',
    'tree.indentGuidesStroke': ui.borderStrong,
    'quickInputList.focusBackground': ui.selected,
    'quickInputList.focusForeground': ui.text,

    // Editor groups & tabs
    'editorGroup.border': ui.border,
    'editorGroup.dropBackground': sol.blue + '1A',
    'editorGroupHeader.tabsBackground': ui.tabBar,
    'editorGroupHeader.tabsBorder': ui.border,
    'tab.activeBackground': ui.editor,
    'tab.activeForeground': ui.text,
    'tab.activeBorderTop': ui.accent,
    'tab.inactiveBackground': ui.tabBar,
    'tab.inactiveForeground': ui.textMuted,
    'tab.hoverBackground': shade(bg, 0.035),
    'tab.border': ui.border,
    'tab.activeModifiedBorder': ui.claude,
    'tab.inactiveModifiedBorder': ui.claude + '88',
    'tab.lastPinnedBorder': ui.borderStrong,
    'breadcrumb.foreground': ui.textMuted,
    'breadcrumb.focusForeground': ui.text,
    'breadcrumb.activeSelectionForeground': ui.text,
    'breadcrumb.background': ui.editor,

    // Editor (text color stays Solarized)
    'editor.background': ui.editor,
    'editor.foreground': sol.base00,
    'editorCursor.foreground': sol.base00,
    'editor.lineHighlightBackground': shade(editorBg, 0.03),
    'editor.lineHighlightBorder': '#00000000',
    'editor.selectionBackground': sol.blue + '2E',
    'editor.inactiveSelectionBackground': sol.blue + '1A',
    'editor.selectionHighlightBackground': sol.blue + '1A',
    'editor.wordHighlightBackground': sol.blue + '1A',
    'editor.wordHighlightStrongBackground': sol.blue + '26',
    'editor.findMatchBackground': sol.yellow + '55',
    'editor.findMatchHighlightBackground': sol.yellow + '26',
    'editor.rangeHighlightBackground': shade(editorBg, 0.045),
    'editorLineNumber.foreground': ui.textFaint,
    'editorLineNumber.activeForeground': sol.base00,
    'editorWhitespace.foreground': shade(editorBg, 0.1),
    'editorIndentGuide.background1': '#586E7580', // Solarized's
    'editorIndentGuide.activeBackground1': '#081E2580', // Solarized's
    'editorRuler.foreground': ui.border,
    'editorBracketMatch.background': sol.blue + '1A',
    'editorBracketMatch.border': sol.blue + '66',
    'editorGutter.background': ui.editor,
    'editorGutter.addedBackground': sol.green,
    'editorGutter.modifiedBackground': sol.blue,
    'editorGutter.deletedBackground': sol.red,
    'editorError.foreground': sol.red,
    'editorWarning.foreground': sol.yellow,
    'editorInfo.foreground': sol.blue,
    'editorInlayHint.foreground': ui.textMuted,
    'editorInlayHint.background': shade(editorBg, 0.05),
    'editorCodeLens.foreground': ui.textFaint,
    'editorOverviewRuler.border': '#00000000',
    'editorStickyScroll.background': ui.editor,
    'editorStickyScrollHover.background': ui.hover,

    // Widgets
    'editorWidget.background': ui.bg,
    'editorWidget.border': ui.border,
    'editorHoverWidget.background': ui.bg,
    'editorHoverWidget.border': ui.border,
    'editorSuggestWidget.background': ui.bg,
    'editorSuggestWidget.border': ui.border,
    'editorSuggestWidget.selectedBackground': ui.selected,
    'editorSuggestWidget.highlightForeground': sol.yellow,
    'quickInput.background': ui.bg,
    'quickInputTitle.background': ui.bg,
    'pickerGroup.foreground': ui.textMuted,
    'pickerGroup.border': ui.border,
    'peekView.border': ui.borderStrong,
    'peekViewTitle.background': ui.bg,
    'peekViewEditor.background': ui.editor,
    'peekViewResult.background': ui.bg,
    'peekViewEditor.matchHighlightBackground': sol.yellow + '33',
    'notifications.background': ui.bg,
    'notifications.border': ui.border,
    'notificationCenterHeader.background': ui.bg,
    'menu.background': ui.bg,
    'menu.foreground': ui.text,
    'menu.selectionBackground': ui.selected,
    'menu.selectionForeground': ui.text,
    'menu.separatorBackground': ui.border,
    'menu.border': ui.border,

    // Minimap & scrollbar
    'minimap.background': ui.editor,
    'minimap.selectionHighlight': sol.blue + '55',
    'scrollbar.shadow': '#00000000',
    'scrollbarSlider.background': '#0000001A',
    'scrollbarSlider.hoverBackground': '#0000002A',
    'scrollbarSlider.activeBackground': '#0000003A',

    // Inputs & controls
    'input.background': ui.bg,
    'input.foreground': ui.text,
    'input.border': ui.border,
    'input.placeholderForeground': ui.textFaint,
    'inputOption.activeBorder': ui.accent + '99',
    'inputOption.activeBackground': sol.blue + '1A',
    'dropdown.background': ui.bg,
    'dropdown.border': ui.border,
    'dropdown.foreground': ui.text,
    'checkbox.background': ui.bg,
    'checkbox.border': ui.borderStrong,
    'button.background': ui.text,
    'button.foreground': ui.white,
    'button.hoverBackground': '#3A3A38',
    'button.secondaryBackground': ui.selected,
    'button.secondaryForeground': ui.text,
    'button.secondaryHoverBackground': shade(bg, 0.08),
    'button.separator': '#FFFFFF55',
    'badge.background': ui.claude,
    'badge.foreground': ui.white,
    'progressBar.background': ui.claude,
    'keybindingLabel.background': ui.bg,
    'keybindingLabel.border': ui.border,
    'keybindingLabel.bottomBorder': ui.borderStrong,
    'extensionButton.prominentBackground': ui.text,
    'extensionButton.prominentForeground': ui.white,
    'extensionButton.prominentHoverBackground': '#3A3A38',

    // Panel & terminal
    'panel.background': ui.bg,
    'panel.border': ui.border,
    'panelTitle.activeForeground': ui.text,
    'panelTitle.inactiveForeground': ui.textMuted,
    'panelTitle.activeBorder': ui.text,
    'panelSection.border': ui.border,
    'panelSectionHeader.background': ui.bg,
    'terminal.background': ui.bg,
    'terminal.foreground': sol.base00,
    'terminalCursor.foreground': sol.base00,
    'terminal.selectionBackground': sol.blue + '2E',

    // Status bar
    'statusBar.background': ui.bg,
    'statusBar.foreground': ui.textMuted,
    'statusBar.border': ui.border,
    'statusBar.noFolderBackground': ui.bg,
    'statusBar.debuggingBackground': sol.orange,
    'statusBar.debuggingForeground': ui.white,
    'statusBarItem.hoverBackground': ui.hover,
    'statusBarItem.remoteBackground': ui.bg,
    'statusBarItem.remoteForeground': ui.text,
    'statusBarItem.prominentBackground': ui.selected,

    // Git decorations
    'gitDecoration.addedResourceForeground': sol.green,
    'gitDecoration.untrackedResourceForeground': sol.green,
    'gitDecoration.modifiedResourceForeground': sol.yellow,
    'gitDecoration.deletedResourceForeground': sol.red,
    'gitDecoration.conflictingResourceForeground': sol.magenta,
    'gitDecoration.ignoredResourceForeground': ui.textFaint,
    'diffEditor.insertedTextBackground': sol.green + '22',
    'diffEditor.removedTextBackground': sol.red + '1A',
    'diffEditor.insertedLineBackground': sol.green + '12',
    'diffEditor.removedLineBackground': sol.red + '0E',

    // Misc
    'debugToolBar.background': ui.bg,
    'welcomePage.background': ui.bg,
    'walkThrough.embeddedEditorBackground': ui.bg,
    'notebook.cellEditorBackground': ui.bg,
    'ports.iconRunningProcessForeground': sol.cyan,
  }

  // Terminal ANSI: Solarized exactly
  for (const [k, v] of Object.entries(upstream.colors)) {
    if (k.startsWith('terminal.ansi')) colors[k] = v
  }

  return colors
}

// groovyLambda: Groovy Lambda as it is, with its tones from knobs.groovyLambda
const makeGroovyTheme = (knobs, name) => {
  const tones = { ...groovyTones, ...knobs.groovyLambda }
  const map = new Map(
    Object.entries(groovyTones).map(([k, hex]) => [hex, tones[k].toUpperCase()]),
  )
  const colors = Object.fromEntries(
    Object.entries(groovyUpstream.colors).map(([k, v]) => [k, recolor(v, map)]),
  )
  return { ...groovyUpstream, name, colors }
}

// solarizedUi: keep Solarized Light's own UI, with its tones from
// knobs.solarizedUi (defaults = Solarized exactly) and accents from the palette
const makeTheme = (knobs, palette, name, { solarizedUi = false, groovyLambda = false } = {}) => {
  if (groovyLambda) return makeGroovyTheme(knobs, name)
  const tokenColors = syntaxFor(palette)
  if (solarizedUi) {
    const tones = { ...solarizedTones, ...knobs.solarizedUi }
    const map = new Map(
      Object.entries(solarizedTones).map(([k, hex]) => [hex, tones[k].toUpperCase()]),
    )
    // Terminal ANSI colors keep Solarized's values even where they share a tone
    const colors = Object.fromEntries(
      Object.entries(upstream.colors).map(([k, v]) => [
        k,
        k.startsWith('terminal.ansi') ? v : recolor(v, map),
      ]),
    )
    for (const t of tokenColors) {
      if (t.settings.foreground) t.settings.foreground = recolor(t.settings.foreground, map)
    }
    return { ...upstream, name, type: 'light', colors, tokenColors }
  }
  const colors = makeColors(knobs)
  // Comments match the inline git blame text (editorInlayHint.foreground)
  for (const t of tokenColors) {
    if (t.scope === 'comment') t.settings = { ...t.settings, foreground: knobs.textMuted }
  }
  return {
    name,
    type: 'light',
    semanticHighlighting: upstream.semanticHighlighting,
    colors,
    tokenColors,
  }
}

module.exports = { makeTheme, solarizedTones, groovyTones }
