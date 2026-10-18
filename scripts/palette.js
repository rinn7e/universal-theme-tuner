// Builds palette.html: every color in the built themes, with the keys/scopes using it
const fs = require('fs')
const path = require('path')
const { palettes } = require('./palettes')

const root = path.join(__dirname, '..')
const ids = Object.keys(palettes)
const themes = ids.map((id) =>
  JSON.parse(
    fs.readFileSync(path.join(root, 'themes', `solarized-white-${id}-color-theme.json`), 'utf8'),
  ),
)
// UI and terminal colors are the same in every theme
const theme = themes[0]

const norm = (c) => c.toUpperCase()
const esc = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;')

// color -> list of usages
const group = (entries) => {
  const map = new Map()
  for (const [color, use] of entries) {
    const c = norm(color)
    if (!map.has(c)) map.set(c, [])
    map.get(c).push(use)
  }
  // most used first
  return [...map.entries()].sort((a, b) => b[1].length - a[1].length)
}

// Syntax rules grouped by their colors across all themes (key: "1hex|2hex|3hex")
const syntax = group(
  theme.tokenColors
    .map((t, i) => [t, i])
    .filter(([t]) => t.settings && t.settings.foreground)
    .map(([t, i]) => {
      const scope = [].concat(t.scope || 'default text').join(', ')
      const style = t.settings.fontStyle ? ` (${t.settings.fontStyle})` : ''
      const key = themes.map((th) => norm(th.tokenColors[i].settings.foreground)).join('|')
      return [key, (t.name ? `${t.name}: ` : '') + scope + style]
    }),
)

const ansi = group(
  Object.entries(theme.colors)
    .filter(([k]) => k.startsWith('terminal.ansi'))
    .map(([k, v]) => [v, k.replace('terminal.', '')]),
)

const ui = group(
  Object.entries(theme.colors)
    .filter(([k]) => !k.startsWith('terminal.ansi'))
    .map(([k, v]) => [v, k]),
)

const compare = () => {
  const names = Object.keys(palettes[ids[0]])
  const head = ids.map((id) => `<th>Solarized White ${id}</th>`).join('')
  const rows = names
    .map(
      (n) =>
        `<tr><td>${n}</td>${ids
          .map(
            (id) =>
              `<td><span class="chip" style="background:${palettes[id][n]}"></span><code style="color:${palettes[id][n]}">${palettes[id][n]}</code></td>`,
          )
          .join('')}</tr>`,
    )
    .join('')
  return `
  <section>
    <h2>Syntax palettes</h2>
    <p class="note">Each Solarized accent and the shade every theme swaps in, from <code>scripts/palettes.js</code>.</p>
    <table><thead><tr><th>Accent</th>${head}</tr></thead><tbody>${rows}</tbody></table>
  </section>`
}

const card = ([color, uses]) => `
  <article class="card">
    <div class="swatch"><div style="background:${color}"></div></div>
    <div class="info">
      <code class="hex">${color}</code>
      <span class="count">${uses.length} use${uses.length > 1 ? 's' : ''}</span>
      <ul>${uses.map((u) => `<li>${esc(u)}</li>`).join('')}</ul>
    </div>
  </article>`

// One stripe per theme; the hex line lists each theme's color when they differ
const syntaxCard = ([key, uses]) => {
  const colors = key.split('|')
  const same = colors.every((c) => c === colors[0])
  return `
  <article class="card">
    <div class="swatch stripes">${colors.map((c) => `<div style="background:${c}"></div>`).join('')}</div>
    <div class="info">
      ${same ? `<code class="hex">${colors[0]}</code>` : colors.map((c, i) => `<code class="hex" style="color:${c}">${ids[i]} ${c}</code>`).join(' ')}
      <span class="count">${uses.length} use${uses.length > 1 ? 's' : ''}</span>
      <ul>${uses.map((u) => `<li>${esc(u)}</li>`).join('')}</ul>
    </div>
  </article>`
}

const section = (title, note, items, render = card) => `
  <section>
    <h2>${title} <span>${items.length} colors</span></h2>
    <p class="note">${note}</p>
    <div class="grid">${items.map(render).join('')}</div>
  </section>`

const html = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Solarized White Palette</title>
<style>
  :root { --bg: #F5F5F5; --card: #FFFFFF; --text: #1F1F1E; --muted: #7D7D78; --border: #E2E2DF; }
  * { box-sizing: border-box; }
  body { margin: 0; background: var(--bg); color: var(--text);
    font: 14px/1.5 -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; }
  main { max-width: 1200px; margin: 0 auto; padding: 32px 16px 64px; }
  h1 { font-size: 26px; margin: 0 0 4px; }
  .sub { color: var(--muted); margin: 0 0 32px; }
  h2 { font-size: 18px; margin: 40px 0 4px; }
  h2 span { color: var(--muted); font-weight: 400; font-size: 14px; margin-left: 6px; }
  .note { color: var(--muted); margin: 0 0 16px; }
  .grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(260px, 1fr)); gap: 12px; }
  .card { background: var(--card); border: 1px solid var(--border); border-radius: 10px; overflow: hidden; }
  .swatch { height: 64px; border-bottom: 1px solid var(--border);
    background: repeating-conic-gradient(#E6E6E6 0 25%, #FFF 0 50%) 0 0 / 12px 12px; }
  .swatch div { height: 100%; }
  .stripes { display: flex; }
  .stripes div { flex: 1; }
  .info { padding: 10px 12px 12px; }
  .hex { font: 600 14px "SF Mono", Menlo, monospace; }
  .count { float: right; color: var(--muted); font-size: 12px; }
  ul { margin: 6px 0 0; padding: 0; list-style: none; max-height: 140px; overflow: auto; }
  li { font: 12px/1.6 "SF Mono", Menlo, monospace; color: var(--muted); word-break: break-word; }
  table { border-collapse: collapse; background: ${theme.colors['editor.background']}; border: 1px solid var(--border); border-radius: 10px; overflow: hidden; }
  th, td { padding: 8px 16px; text-align: left; border-bottom: 1px solid var(--border); white-space: nowrap; }
  th { font-weight: 600; font-size: 13px; }
  td code { font: 600 14px "SF Mono", Menlo, monospace; }
  .chip { display: inline-block; width: 16px; height: 16px; border-radius: 4px; vertical-align: -3px; margin-right: 8px; }
  @media (max-width: 520px) { th, td { padding: 8px; } }
</style>
</head>
<body>
<main>
  <h1>Solarized White</h1>
  <p class="sub">Every color in the Solarized White ${ids.join(', ')} themes (<code>themes/</code>), generated by <code>scripts/palette.js</code>. Checkered swatches are partly transparent.</p>
  ${compare()}
  ${section('Syntax', 'Solarized Light rules; stripes show themes ' + ids.join(', ') + ' left to right.', syntax, syntaxCard)}
  ${section('Terminal ANSI', 'Solarized’s 16 terminal colors, the same in every theme.', ansi)}
  ${section('UI', 'Window, editor and widget colors, the same in every theme, most used first.', ui)}
</main>
</body>
</html>
`

const out = path.join(root, 'palette.html')
fs.writeFileSync(out, html)
console.log('wrote', path.relative(root, out))
