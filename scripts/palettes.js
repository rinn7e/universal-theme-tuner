// Syntax palettes: each maps a Solarized accent to the shade the theme uses.
// Grays (text, comments) stay Solarized in every palette.
const solarized = {
  yellow: '#B58900',
  orange: '#CB4B16',
  red: '#DC322F',
  magenta: '#D33682',
  violet: '#6C71C4',
  blue: '#268BD2',
  cyan: '#2AA198',
  green: '#859900',
}

const palettes = {
  // Solarized Light, unchanged
  1: { ...solarized },
  // Min Light (github.com/miguelsolorio/min-theme): each accent takes
  // Min's color of the same hue
  2: {
    yellow: '#CD9731',
    orange: '#CB4B16', // Solarized's; Min's #FF9800 is too bright
    red: '#D32F2F',
    magenta: '#800080',
    violet: '#6F42C1',
    blue: '#1976D2',
    cyan: '#22863A',
    green: '#859900', // Solarized's
  },
  // Palette 2 with a brighter cyan-blue, between blue and green
  3: {
    yellow: '#CD9731',
    orange: '#CB4B16',
    red: '#D32F2F',
    magenta: '#800080',
    violet: '#6F42C1',
    blue: '#0086C0',
    cyan: '#22863A',
    green: '#859900',
  },
  // A full copy of Solarized Light (UI too, see solarizedUi), written out so
  // its syntax can be tuned while palette 1 stays the original
  4: {
    yellow: '#B58900',
    orange: '#CB4B16',
    red: '#DC322F',
    magenta: '#D33682',
    violet: '#6C71C4',
    blue: '#268BD2',
    cyan: '#2AA198',
    green: '#859900',
  },
}

// Themes that keep Solarized Light's own UI (cream background, beige bars,
// original comments) instead of the Solarized White knobs
const solarizedUi = ['4']

module.exports = { solarized, palettes, solarizedUi }
