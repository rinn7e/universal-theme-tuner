# Compatibility: other extensions and web components

Solarize runs as a second layer: other extensions (Dark Reader, Damn Center)
paint first, and Solarize recolors what they produce. This file explains the
choices in `src/worker/content.ts` that make that work, so they aren't undone
by a well-meant simplification.

## Dark Reader

Dark Reader's dynamic mode darkens a page by adding `<style>` elements, some
time after the page loads or the OS theme switches.

- **Re-read after Dark Reader settles.** Adding, removing or rewriting any page
  stylesheet triggers a full re-read once stylesheet changes go quiet for
  100 ms (`RESTYLE_SETTLE_MS`), so a burst of Dark Reader stylesheets costs one
  scan. `<link>` stylesheets count when they finish loading.
- **Our stylesheet carries `class="stylus"`.** Dark Reader's
  `shouldManageStyle` (in `src/inject/dynamic-theme/style-manager.ts`) skips
  stylesheets with that class, a courtesy to the Stylus extension, so it
  neither rewrites nor removes our colors.
- **Our rules sit in a first-declared cascade layer** (`@layer solarize`, in a
  `<style>` that is the first child of `<html>`). Dark Reader paints `<html>`
  inside an anonymous `@layer` with `!important`, and for `!important`
  declarations a layered rule beats any unlayered one whatever its specificity,
  while among layers the first declared wins. A specificity boost was tried
  first and lost to that layer. Keep the `<style>` first in the document:
  adopted stylesheets come after document stylesheets, so the document's copy
  can't be an adopted sheet.

## Damn Center

Damn Center adds side pads (`#damn-center-left`, `#damn-center-right`) to
`<html>` and paints them with inline styles that fade in through
`transition: background 0.15s`.

- **Pause transitions while reading.** Reading a background that is still
  fading returns a frame of the fade (often transparent), and nothing signals
  when it ends. Elements whose background animates are marked with
  `data-solarize-reading` for the instant of the read; our rules map it to
  `transition: none !important`, so the browser reports the final color. The
  mark is removed in the same pass, so the element's own transitions keep
  working. `animatesBackground` decides which elements need it.
- **Transparent pads show `<html>`.** That is why the cascade layer above
  matters together with Damn Center: with Dark Reader on, `<html>` carries
  Dark Reader's layered color.

## OS theme switches

On a `prefers-color-scheme` change Solarize re-reads the page in place,
without clearing its tags first (no flash), with the first batch inside the
event. It reads again 150 ms later (`THEME_SETTLE_MS`) for sites whose own
scripts react after the event, and again when a background tab becomes
visible, since timers are throttled while hidden. Attribute changes on
`<html>` and `<body>` (`data-theme`, `data-color-mode`, classes) also trigger
a re-read.

## Shadow DOM and web components

Sites built from web components (Reddit's `shreddit-*` and `faceplate-*`)
render inside shadow roots, which neither a document scan nor a document
stylesheet reaches.

- **Walking:** scans step into open shadow roots (`element.shadowRoot`) and
  closed ones (`chrome.dom.openOrClosedShadowRoot` in Chrome,
  `element.openOrClosedShadowRoot` in Firefox). Only custom elements are asked
  for closed roots during scans, since the lookup costs a call.
- **Styling:** every shadow root adopts one shared constructed copy of our
  rules (`adoptedStyleSheets`), kept in step with the document's copy; where
  adopting fails (Firefox content scripts can refuse it, jsdom lacks it) the
  root gets its own `<style class="stylus">`.
- **Observing:** each shadow root found is added to the same
  `MutationObserver`.
- **Roots attached in place:** a component that upgrades an element already on
  the page attaches its root without any DOM change an observer sees.
  `shadow-hook.js` runs in the page's main world at `document_start`, wraps
  `attachShadow` and fires `solarize:shadow-attached` on the host. Chrome and
  Firefox 128+ load it; Safari's manifest leaves it out.

## Testing these cases

The jsdom tests in `test/content.test.ts` cover the logic, but jsdom models
neither cascade layers, transitions nor `adoptedStyleSheets`. Check those in a
real Chrome: for Dark Reader, its engine is published on npm (`darkreader`,
`DarkReader.enable()`), so a local page can load it next to the built
`content.js` with a stubbed `chrome.storage`.
