/**
 * Pulls the <div class="phone-screen"> subtree (the app UI, without the
 * source preview's own phone bezel) and the original <head> out of a
 * preview-dark.html file from Meliwat/awesome-ios-design-md, then rebuilds
 * a minimal document that renders just that app UI filling the viewport.
 *
 * Returns null if the expected structure is not found.
 */
export function extractPhoneDocument(html: string): string | null {
  const head = html.match(/<head[^>]*>([\s\S]*?)<\/head>/i)?.[1] ?? ''

  const start = html.indexOf('<div class="phone-screen">')
  if (start === -1) return null

  const screen = readBalancedDiv(html, start)
  if (!screen) return null

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
${head}
<style>
  html, body {
    margin: 0 !important;
    padding: 0 !important;
    background: var(--canvas, #000) !important;
    width: 100% !important;
    height: 100% !important;
    overflow: hidden !important;
  }
  body { display: block !important; }
  .phone-screen {
    width: 100vw !important;
    height: 100vh !important;
    border-radius: 0 !important;
    box-shadow: none !important;
    position: relative !important;
  }
</style>
</head>
<body>${screen}</body>
</html>`
}

/**
 * Starting from an index pointing at `<div`, walk forward counting nested
 * `<div>` opens and `</div>` closes, and return the substring from start
 * through the matching close tag (inclusive). Relies on the fact that the
 * source is machine-generated and does not include `<div` inside strings,
 * script blocks, or comments.
 */
function readBalancedDiv(html: string, startIndex: number): string | null {
  let i = startIndex
  let depth = 0
  while (i < html.length) {
    const openIdx = html.indexOf('<div', i)
    const closeIdx = html.indexOf('</div>', i)
    if (closeIdx === -1) return null
    if (openIdx !== -1 && openIdx < closeIdx) {
      depth++
      const gt = html.indexOf('>', openIdx)
      if (gt === -1) return null
      i = gt + 1
    } else {
      depth--
      i = closeIdx + 6
      if (depth === 0) return html.substring(startIndex, i)
    }
  }
  return null
}
