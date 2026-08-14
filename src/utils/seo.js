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
