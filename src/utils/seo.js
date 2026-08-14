import { useEffect } from 'react'

/**
 * Per-page title and description, without a dependency.
 *
 * The site is client-rendered, so every route is served the same `index.html`.
 * Google executes JS and will pick up what this sets, but a link preview
 * scraper — WhatsApp, Facebook, Slack — generally does not: it reads the raw
 * HTML and leaves. So `index.html` carries a good default for *every* URL, and
 * this narrows it per page for search results and the browser tab.
 *
 * Deliberately not react-helmet. One `useEffect` that writes to `document` does
 * the whole job here; a package would add a provider, a bundle and a
 * dependency to keep current, for a site with no server-side rendering to
 * coordinate with.
 *
 * **What this cannot do:** make a product page's own title appear in a
 * WhatsApp preview. That needs the HTML to already contain it, which means
 * server-side rendering or prerendering — see the note in DEPLOY notes. Titles
 * in Google results do work, because Googlebot renders the page.
 */

const SITE = 'F2H Market'
const ORIGIN = 'https://f2hmarket.com'

/**
 * Force a URL absolute, for structured data.
 *
 * Schema.org URLs must be absolute — a crawler has no page to resolve `/uploads/x.jpg`
 * against. `mediaUrl()` returns a relative path in development, where the API
 * origin is empty and Vite proxies everything, so image URLs would be relative
 * in exactly the environment nobody notices and absolute in production.
 *
 * Always the public origin, never `window.location`: markup generated on
 * localhost must not tell Google the image lives on localhost.
 */
export function absoluteUrl(path) {
  if (!path) return null
  if (/^https?:\/\//i.test(path)) return path
  return ORIGIN + (path.startsWith('/') ? '' : '/') + path
}

function setMeta(selector, attr, value) {
  if (!value) return
  let el = document.head.querySelector(selector)
  if (!el) {
    el = document.createElement('meta')
    const [, kind, name] = selector.match(/\[(name|property)="([^"]+)"\]/) || []
    if (!kind) return
    el.setAttribute(kind, name)
    document.head.appendChild(el)
  }
  el.setAttribute(attr, value)
}

function setCanonical(path) {
  let el = document.head.querySelector('link[rel="canonical"]')
  if (!el) {
    el = document.createElement('link')
    el.setAttribute('rel', 'canonical')
    document.head.appendChild(el)
  }
  // Query strings are stripped: /products?q=tomato and /products?q=onion are
  // the same page to a search engine, and letting each one be its own canonical
  // URL splits the ranking of the page across infinite variants.
  el.setAttribute('href', ORIGIN + (path || '/').split('?')[0])
}

/**
 * @param {string} title       Page title, without the site name — added here.
 * @param {string} description 150–160 characters. Longer is truncated in results.
 * @param {object} [options]
 * @param {boolean} [options.noIndex] Keep this page out of search results.
 */
export function useSeo(title, description, options = {}) {
  const { noIndex = false } = options

  useEffect(() => {
    const full = title ? `${title} | ${SITE}` : `${SITE} — Farm to Home | Fresh Groceries Delivered`
    document.title = full

    setMeta('meta[name="description"]', 'content', description)
    setMeta('meta[property="og:title"]', 'content', full)
    setMeta('meta[property="og:description"]', 'content', description)
    setMeta('meta[name="twitter:title"]', 'content', full)
    setMeta('meta[name="twitter:description"]', 'content', description)
    setMeta('meta[property="og:url"]', 'content', ORIGIN + window.location.pathname)
    setCanonical(window.location.pathname)

    // A dashboard behind a login has nothing to offer a search result, and
    // indexing it invites Google to spend its crawl budget on pages it will
    // only ever see as a redirect.
    setMeta('meta[name="robots"]', 'content',
      noIndex ? 'noindex, nofollow' : 'index, follow, max-image-preview:large, max-snippet:-1')
  }, [title, description, noIndex])
}

/** Signed-in pages: correct tab title, kept out of search results. */
export function usePrivatePageSeo(title) {
  useSeo(title, undefined, { noIndex: true })
}

/**
 * Attach a JSON-LD block to a page, and take it away when the page unmounts.
 *
 * The site-wide Organization and WebSite entities live in `index.html`. This is
 * for schema that belongs to one route — an FAQ, a breadcrumb, a product — and
 * the removal matters: leaving a product's markup behind after navigating away
 * would describe the *next* page as that product.
 *
 * `id` keeps it to one tag per kind, so a re-render replaces rather than stacks.
 */
export function useJsonLd(id, data) {
  // Serialised for the dependency so a fresh object literal on every render does
  // not tear the tag down and rebuild it each time.
  //
  // `data` is null while the page is still fetching, and `JSON.stringify(null)`
  // is the *string* "null" — truthy, so a plain falsy check would emit a script
  // tag containing the literal `null` and hand Google malformed markup.
  const json = data == null ? null : JSON.stringify(data)

  useEffect(() => {
    if (!json) return
    const elementId = `ld-${id}`
    let el = document.getElementById(elementId)
    if (!el) {
      el = document.createElement('script')
      el.type = 'application/ld+json'
      el.id = elementId
      document.head.appendChild(el)
    }
    el.textContent = json
    return () => { document.getElementById(elementId)?.remove() }
  }, [id, json])
}
