// Wraps theme.css into apply-theme.snippet.js, the file pasted into the Claude
// app's DevTools (Sources > Snippets). Rerun after editing theme.css.
const fs = require('fs')
const path = require('path')

const css = fs.readFileSync(path.join(__dirname, 'theme.css'), 'utf8')

const js = `// Generated from theme.css by build.js. Edit theme.css, not this file.
// Paste into the Claude app's DevTools: Sources > Snippets > + New snippet, run with Cmd+Enter.
(() => {
  const ID = "user-solarized-light-theme";
  const css = ${JSON.stringify(css)};
  let el = document.getElementById(ID);
  if (!el) {
    el = document.createElement("style");
    el.id = ID;
    document.head.appendChild(el);
  }
  el.textContent = css;
  if (!el.dataset.pinned) {
    el.dataset.pinned = "1";
    // Keep the override last in <head> so stylesheets loaded later do not outrank it.
    new MutationObserver(() => {
      if (document.head.lastElementChild !== el) document.head.appendChild(el);
    }).observe(document.head, { childList: true });
  }
  console.log("[theme] Solarized Light applied", css.length, "chars of CSS");
})();
`

const out = path.join(__dirname, 'apply-theme.snippet.js')
fs.writeFileSync(out, js)
console.log('wrote', path.relative(path.join(__dirname, '..'), out))
