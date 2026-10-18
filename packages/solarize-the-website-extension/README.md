# Solarize

A browser extension for Chrome, Firefox and Safari that recolors websites with
the Solarized palette:

- **Light pages:** white and light-gray backgrounds become Solarized Light
  (`#fdf6e3`, `#f5efdc`, `#eee8d5`, `#e4ddc8`, by how light they were)
- **Dark pages:** black and dark-gray backgrounds become Solarized Dark
  (`#002b36`, `#073642`, `#0d4251`)

Gray gradients, like a fade to white under a "Show more" button, are recolored
too, keeping their transparency. Colored backgrounds (buttons, brand colors),
images, colorful gradients and translucent overlays are left alone, so sites
keep their identity.

## Popup

- **Global switch** (header): turns Solarize on or off everywhere in one click,
  keeping the other settings for when it comes back on
- **This site:** turns it off for the current site only
- **Light pages / Dark pages:** choose which kind of background to recolor
  (light is on by default)

## How it works

The content script reads each element's computed background color. Neutral
(low-saturation, mostly opaque) backgrounds within the light or dark lightness
bands get a `data-solarize="<tone>"` attribute, and one injected stylesheet
maps each tone to its Solarized color. A `MutationObserver` follows added
elements and class or style changes, and work runs in small time-boxed batches
so pages stay responsive. When neither `<html>` nor `<body>` sets a
background, the browser's canvas is recolored instead.

Web components are covered too, inside open and closed shadow roots, and
Solarize runs on top of Dark Reader and Damn Center, recoloring what they
paint. [doc/compatibility.md](doc/compatibility.md) explains how, and why the
content script is built the way it is.

Settings live in `chrome.storage.local`, decoded with io-ts codecs; content
scripts pick up changes through `chrome.storage.onChanged`.

## Limitations

- Hover and focus backgrounds (`:hover` rules) are not recolored
- Safari doesn't load `shadow-hook.js`, so there a web component that
  upgrades in place is recolored only once its content changes
- Text colors are unchanged

## Development

You need Node.js 24+ and pnpm.

```bash
pnpm install
cp .env.example .env.development
pnpm run build:chrome   # development build in dist/chrome
```

Load `dist/chrome` as an unpacked extension (`chrome://extensions`, Developer
mode, **Load unpacked**). Development builds use the icon with an orange dot
and show the build date in the popup.

Checks: `pnpm run check`, `pnpm run lint`, `pnpm run format:check`,
`pnpm run test`. Follow the [code convention](doc/code-convention.md).
