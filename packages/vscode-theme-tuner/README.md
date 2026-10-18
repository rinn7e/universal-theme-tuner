# Solarized White and Groovy Lambda Black for VS Code, with a Theme Tuner

Four light VS Code themes built from VS Code's Solarized Light syntax rules,
a dark one built from [Groovy Lambda](https://github.com/sheaf/groovy-lambda)
on near-black, plus a **Theme Tuner** panel that previews color changes live
and saves them back to the sources.

| Theme | Syntax | UI |
| --- | --- | --- |
| Solarized White 1 | Solarized Light accents, unchanged | cream panels in the style of the Claude desktop app |
| Solarized White 2 | Min Light accents (orange and green kept from Solarized) | same cream UI |
| Solarized White 3 | Palette 2 with a cyan-blue for functions and variables | same cream UI |
| Solarized White 4 | Solarized Light accents | Solarized Light's own UI, with tunable tones |
| Groovy Lambda Black | Groovy Lambda, unchanged | Groovy Lambda's UI with its background swapped for near-black #151515; its panel tones are tunable |

## Install (development)

Link this folder into VS Code's extensions folder, then restart VS Code:

```bash
ln -s "$PWD" ~/.vscode/extensions/rinn7e.solarized-white-0.0.1
```

Use `~/.vscode-insiders/extensions` for VS Code Insiders. Pick a theme with
**Preferences: Color Theme**.

## Theme Tuner

Run **Solarized White: Tune Colors** from the Command Palette. The panel has:

- **Surfaces & text** — the background, editor darkness, UI text and comment
  colors (for theme 4, Solarized Light's own tones instead; for Groovy Lambda
  Black, the tones that replace Groovy Lambda's)
- **Syntax** — the eight accents, each labelled with what it colors (not for
  Groovy Lambda Black, which keeps Groovy Lambda's own)

Changes show at once: the panel writes them as theme-scoped overrides in
`workbench.colorCustomizations` and `editor.tokenColorCustomizations`. **Save**
writes them to `scripts/knobs.json` and `scripts/palettes.js` and rebuilds the
themes; **Reset** discards them. The overrides are removed when the panel
closes, on Reset and when VS Code starts, so they never stay in your settings.
After a save, reload the window to load the rebuilt themes.

## How the themes are built

```bash
pnpm run build
```

| File | Role |
| --- | --- |
| `scripts/palettes.js` | the syntax palettes: each maps the eight Solarized accents to the shades a theme uses; `solarizedUi` lists the themes that keep Solarized Light's own UI, `groovyLambda` the ones built on Groovy Lambda; `themeName` names them |
| `scripts/knobs.json` | the UI values: background, editor darkness, text colors, Solarized Light's tones for `solarizedUi` themes and the tones replacing Groovy Lambda's for `groovyLambda` ones |
| `scripts/theme.js` | turns knobs and a palette into a theme; shared by the build and the Tuner's live preview |
| `scripts/build.js` | writes one theme per palette and keeps `package.json`'s theme list in step |
| `scripts/palette.js` | writes `palette.html`, every color of the Solarized White themes with the scopes using it |
| `scripts/solarized-light-upstream.json` | VS Code's Solarized Light, the source of the syntax rules (MIT, Microsoft, see `LICENSE-vscode`) |
| `scripts/groovy-lambda-upstream.json` | Groovy Lambda by sheaf, the source of Groovy Lambda Black (MIT, see `LICENSE-groovy-lambda`) |

`themes/*.json`, `palette.html` and the `contributes.themes` list in
`package.json` are generated: change the scripts, `knobs.json` or
`palettes.js`, then rebuild.

To add a theme, add a palette to `scripts/palettes.js` and run the build; it
appears as **Solarized White N**.

## Troubleshooting

- **A new command or theme doesn't show up after `package.json` changed.**
  VS Code starts with a cached copy of the extension's manifest and refreshes
  the cache only after loading extensions, so run **Developer: Reload Window**
  twice.
- **The Tuner shows "Another theme is active".** It previews the selected
  theme; press **Use this theme** to switch to it. With
  `window.autoDetectColorScheme` on, that sets
  `workbench.preferredLightColorTheme` (`preferredDarkColorTheme` for
  Groovy Lambda Black), and the preview shows once the OS is in that mode.
