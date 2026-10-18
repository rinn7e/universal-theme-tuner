// Builds themes/<theme name>-color-theme.json (solarized-white-1, ...,
// groovy-lambda-black), one per theme in palettes.js, from the knobs in
// knobs.json, and lists them in package.json
const fs = require('fs')
const path = require('path')
const { palettes, solarizedUi, groovyLambda, themeIds, themeName } = require('./palettes')
const { makeTheme } = require('./theme')

const root = path.join(__dirname, '..')
const knobs = JSON.parse(fs.readFileSync(path.join(__dirname, 'knobs.json'), 'utf8'))

const themes = themeIds.map((id) => {
  const name = themeName(id)
  const file = `themes/${name.toLowerCase().replace(/ /g, '-')}-color-theme.json`
  const dark = groovyLambda.includes(id)
  const theme = makeTheme(knobs, palettes[id], name, {
    solarizedUi: solarizedUi.includes(id),
    groovyLambda: dark,
  })
  fs.writeFileSync(path.join(root, file), JSON.stringify(theme, null, 2) + '\n')
  console.log('wrote', file)
  return { label: name, uiTheme: dark ? 'vs-dark' : 'vs', path: `./${file}` }
})

// Keep package.json's theme list in step with palettes.js
const pkgPath = path.join(root, 'package.json')
const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'))
pkg.contributes.themes = themes
fs.writeFileSync(pkgPath, JSON.stringify(pkg, null, 2) + '\n')
console.log('updated package.json:', themes.map((t) => t.label).join(', '))
