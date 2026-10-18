# Solarized Light for the Claude desktop app

Recolors the Claude desktop app's light mode with Solarized Light: cream
canvas, beige frame and sidebar, Solarized text tones and an orange accent.
Dark mode stays stock.

It overrides the app's own design-system color variables (`--cds-*`, `--df-*`)
with a stylesheet injected through DevTools, the approach of
[Clay](https://github.com/maximebories/claude-desktop-clay-theme) by Maxime
Bories (MIT, see `LICENSE-clay`). The signed app bundle is not touched.

## Palette

Matched to VS Code's Solarized Light, role for role:

| Claude surface | Color | VS Code Solarized counterpart |
| --- | --- | --- |
| Frame, sidebar, page | `#eee8d5` (base2) | sidebar, title and status bars |
| Chat canvas, composer, panes | `#fdf6e3` (base3) | editor, terminal |
| Cards, inputs | `#f5efdc` (between base3 and base2) | |
| Menus, popovers | `#eee8d5` (base2) | widgets, menus |
| Selected session row | `#dfca88` | list selection |
| Hovered row | `#dfca88` at 27% | list hover |

Text and accent are Solarized hues darkened just enough to pass WCAG AA
(4.5:1) on both base2 and base3; Solarized's own base00, base1 and orange fall
below it as UI text:

| Role | Color | Contrast (worst of base2/base3) |
| --- | --- | --- |
| Primary text | `#073642` (base02) | 10.6:1 |
| Secondary text | `#455f67` (base01, darkened) | 5.5:1 |
| Muted text | `#516b74` (base00, darkened) | 4.6:1 |
| Accent | `#ad461b` (orange, darkened) | 4.7:1 |

Besides `--cds-*`, the theme overrides the Code tab frame's own layer
(`--df-z0`…`--df-z6`, page and sidebar backgrounds, row selection) and
claude.ai's older `--bg-*` and `--text-*` tokens, which otherwise stay white.

## Apply (per launch)

1. Developer Mode must be on: `~/Library/Application Support/Claude/developer_settings.json`
   contains `{ "allowDevTools": true }`. Quit and reopen Claude after creating it.
2. In light mode, right-click anywhere in the app and choose **Inspect Element**.
3. DevTools: **Sources → Snippets → + New snippet**. Paste the whole of
   `apply-theme.snippet.js`, press Cmd+S, then Cmd+Enter.

The theme applies at once and lasts until the app restarts. DevTools keeps the
snippet, so later launches are right-click → Inspect Element → run it.

## Edit

Change the `--sol-*` values at the top of `theme.css`, then run `pnpm run build`
in this package and paste the regenerated `apply-theme.snippet.js`.

## Revert

- Now: in the DevTools Console run
  `document.getElementById("user-solarized-light-theme").remove()`, or restart the app.
- Developer Mode: delete `developer_settings.json` and reopen the app.

## Limitations

- Per launch: Clay's permanent install (an extension loaded through the
  app's `REACT_PROFILE` React DevTools hook plus a login LaunchAgent) is not
  used here.
- App updates can rename the `--cds-*` tokens; checked against Claude 2.42304.0.
- Only the app shell is themed: embedded previews and artifacts render in
  their own documents and keep their colors. Parts colored by script rather
  than these variables (possibly the Code tab terminal) may stay stock.
