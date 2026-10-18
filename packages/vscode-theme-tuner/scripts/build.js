// Builds themes/solarized-white-<n>-color-theme.json, one per palette in
// palettes.js, from the knobs in knobs.json, and lists them in package.json
const fs = require('fs')
const path = require('path')
const { palettes, solarizedUi } = require('./palettes')
const { makeTheme } = require('./theme')

const root = path.join(__dirname, '..')
const knobs = JSON.parse(fs.readFileSync(path.join(__dirname, 'knobs.json'), 'utf8'))

const themes = Object.entries(palettes).map(([id, palette]) => {
  const name = `Solarized White ${id}`
  const file = `themes/solarized-white-${id}-color-theme.json`
  const theme = makeTheme(knobs, palette, name, { solarizedUi: solarizedUi.includes(id) })
  fs.writeFileSync(path.join(root, file), JSON.stringify(theme, null, 2) + '\n')
  console.log('wrote', file)
  return { label: name, uiTheme: 'vs', path: `./${file}` }
})

// Keep package.json's theme list in step with palettes.js
const pkgPath = path.join(root, 'package.json')
const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'))
pkg.contributes.themes = themes
fs.writeFileSync(pkgPath, JSON.stringify(pkg, null, 2) + '\n')
console.log('updated package.json:', themes.map((t) => t.label).join(', '))
