# Universal Theme Tuner

Theme tuners and themes for the apps you use, one package each:

| Package | What it is |
| --- | --- |
| [`vscode-theme-tuner`](packages/vscode-theme-tuner) | The Solarized White VS Code themes (1–4) and the Theme Tuner panel that previews color changes live |
| [`claude-desktop-solarized-theme`](packages/claude-desktop-solarized-theme) | Solarized Light for the Claude desktop app, applied as a DevTools snippet |
| [`solarize-the-website-extension`](packages/solarize-the-website-extension) | Solarize, a Chrome/Firefox/Safari extension that recolors websites with Solarized |

## Development

A pnpm workspace (Node.js 24+):

```bash
pnpm install
pnpm run build   # builds every package
pnpm run test    # runs the packages that have tests
```

Each package also builds on its own, for example
`pnpm --filter ./packages/vscode-theme-tuner run build`.
