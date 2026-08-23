/**
 * On-device layout inspector for phones.
 *
 * iOS Safari has no developer tools, so a layout bug that only appears on an
 * iPhone is otherwise diagnosed by squinting at screenshots and guessing. This
 * puts the answer on the screen instead: open any page with `?layout-debug=1`
 * and it outlines everything sticking out past the viewport, lists what those
 * elements are, and reports the safe-area insets the browser is actually
 * handing the stylesheet.
 *
 * It is inert unless the query parameter is present, so it costs a few hundred
 * bytes and nothing else. To remove it entirely, delete this file and its
 * import in main.jsx.
 */

const PARAM = 'layout-debug'

/* A one-pixel spill is rounding, not a bug. Sub-pixel layout means an element
   that fits perfectly can still measure 393.4px against a 393px viewport. */
const TOLERANCE = 1

/** A short, recognisable name for an element — enough to find it in the source. */
function describe(el) {
  const tag = el.tagName.toLowerCase()
  const id = el.id ? `#${el.id}` : ''
  const cls =
    typeof el.className === 'string' && el.className.trim()
      ? '.' + el.className.trim().split(/\s+/).slice(0, 3).join('.')
      : ''
  return `${tag}${id}${cls}`
}

/**
 * Elements whose box extends past the left or right edge of the viewport.
 *
 * Only the innermost offenders are reported. An element that overflows drags
 * every ancestor out with it, so listing all of them buries the one line that
 * matters under a chain of wrappers that are only guilty by association — the
 * deepest node in any such chain is the one to go and fix.
 */
function findOverflowing() {
  const limit = document.documentElement.clientWidth
  const hits = []

  for (const el of document.body.getElementsByTagName('*')) {
    if (el.closest('[data-layout-debug-panel]')) continue

    const style = getComputedStyle(el)
    if (style.display === 'none' || style.visibility === 'hidden') continue

    const r = el.getBoundingClientRect()
    if (r.width === 0 && r.height === 0) continue

    /* A closed drawer is parked completely off the left edge on purpose. That
       is not overflow, it is how it stays hidden — flagging it would bury the
       real findings under the nav drawer on every single page. */
    if (r.right <= 0) continue

    const spillRight = r.right - limit
    const spillLeft = -r.left
    if (spillRight > TOLERANCE || spillLeft > TOLERANCE) {
      hits.push({ el, spill: Math.round(Math.max(spillRight, spillLeft)), width: Math.round(r.width) })
    }
  }

  const flagged = new Set(hits.map((h) => h.el))
  return hits
    .filter(({ el }) => ![...el.children].some((c) => flagged.has(c)))
    .sort((a, b) => b.spill - a.spill)
    .slice(0, 12)
}

/** What the browser is actually substituting for env(safe-area-inset-*). */
function readInsets() {
  const probe = document.createElement('div')
  probe.style.cssText =
    'position:fixed;top:0;left:0;visibility:hidden;pointer-events:none;' +
    'padding-top:env(safe-area-inset-top);padding-right:env(safe-area-inset-right);' +
    'padding-bottom:env(safe-area-inset-bottom);padding-left:env(safe-area-inset-left)'
  document.body.appendChild(probe)
  const s = getComputedStyle(probe)
  const insets = {
    top: s.paddingTop,
    right: s.paddingRight,
    bottom: s.paddingBottom,
    left: s.paddingLeft,
  }
  probe.remove()
  return insets
}

function render(panel) {
  const limit = document.documentElement.clientWidth
  const insets = readInsets()
  const hits = findOverflowing()

  /* Measured from the elements themselves rather than from `scrollWidth`.

     `body` carries `overflow-x: clip`, which is deliberate — it stops a stray
     few pixels from turning the page into a sideways scroller. But clipping
     also means `scrollWidth` reports the viewport width no matter what is
     spilling, so it would cheerfully say "fits" while an element hangs 60px
     off the side. The element rects still describe the real geometry. */
  const widest = hits.length ? limit + hits[0].spill : limit

  document.querySelectorAll('[data-layout-debug-hit]').forEach((el) => {
    el.style.outline = ''
    el.removeAttribute('data-layout-debug-hit')
  })
  hits.forEach(({ el }) => {
    el.style.outline = '2px solid #e11d48'
    el.setAttribute('data-layout-debug-hit', '')
  })

  /* An inset of 0px on all four sides on a notched phone is itself the finding:
     it means viewport-fit=cover is missing from the viewport meta, and every
     env() in the stylesheet is quietly evaluating to nothing. */
  const insetsAllZero = Object.values(insets).every((v) => parseFloat(v) === 0)

  panel.innerHTML = `
    <div style="font-weight:700;margin-bottom:6px">Layout check</div>
    <div>viewport <b>${limit}px</b> &middot; content <b>${widest}px</b>
      ${widest > limit + TOLERANCE
        ? `<span style="color:#fca5a5">&nbsp;spills ${widest - limit}px</span>`
        : `<span style="color:#86efac">&nbsp;fits</span>`}</div>
    <div style="margin-top:4px">safe area T ${insets.top} R ${insets.right} B ${insets.bottom} L ${insets.left}
      ${insetsAllZero ? '<span style="color:#fca5a5">&nbsp;(all zero)</span>' : ''}</div>
    <div style="margin-top:8px;font-weight:700">
      ${hits.length ? `Sticking out (${hits.length})` : 'Nothing sticking out'}
    </div>
    ${hits
      .map(
        ({ el, spill, width }) =>
          `<div style="margin-top:3px;color:#fca5a5">+${spill}px &nbsp;<span style="color:#e5e7eb">${describe(
            el
          )}</span> <span style="opacity:.6">${width}px wide</span></div>`
      )
      .join('')}
    <div style="margin-top:8px;opacity:.6">Rotate or scroll and it re-checks.</div>
  `
}

export function initLayoutDebug() {
  if (typeof window === 'undefined') return
  if (!new URLSearchParams(window.location.search).has(PARAM)) return

  const panel = document.createElement('div')
  panel.setAttribute('data-layout-debug-panel', '')
  panel.style.cssText =
    'position:fixed;left:8px;right:8px;bottom:calc(8px + env(safe-area-inset-bottom));' +
    'z-index:2147483647;background:rgba(17,24,39,.95);color:#e5e7eb;' +
    'font:12px/1.45 ui-monospace,SFMono-Regular,Menlo,monospace;' +
    'padding:12px 14px;border-radius:12px;max-height:52vh;overflow:auto;' +
    '-webkit-overflow-scrolling:touch;box-shadow:0 8px 30px rgba(0,0,0,.5)'
  panel.addEventListener('click', () => panel.remove())

  const start = () => {
    document.body.appendChild(panel)
    const run = () => render(panel)
    run()
    /* Layout settles after images decode and fonts swap, and both can change
       an element's width — so re-measure rather than trusting the first pass. */
    window.addEventListener('resize', run)
    window.addEventListener('orientationchange', () => setTimeout(run, 300))
    window.addEventListener('load', run)
    setInterval(run, 1500)
  }

  if (document.body) start()
  else window.addEventListener('DOMContentLoaded', start)
}
