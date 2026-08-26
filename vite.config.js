import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

/**
 * Where `npm run dev` sends API traffic.
 *
 * Set F2H_DEV_API to switch without editing this file:
 *
 *   npm run dev                                    → local Flask on :5000
 *   F2H_DEV_API=https://api.f2hmarket.com:8443 npm run dev   → production
 *
 * Going through the proxy rather than pointing the browser straight at the API
 * is what makes the production target usable at all. The proxy call is made by
 * Node, server to server, so it is not subject to CORS — and the browser still
 * sees a single origin (localhost:5173), so the httpOnly auth cookie is
 * first-party and gets sent. Point the browser directly at the API instead and
 * dev breaks twice: the API rejects the origin, and a SameSite cookie is not
 * sent cross-site, so nothing is ever authenticated.
 */
const API_TARGET = process.env.F2H_DEV_API || 'http://localhost:5000'

const proxy = {
  target: API_TARGET,
  changeOrigin: true,
  // Production sets the cookie for api.f2hmarket.com; the browser is on
  // localhost and would discard it. Rewriting the domain to nothing makes it a
  // host-only cookie for whatever origin the dev server is on.
  cookieDomainRewrite: '',
}

export default defineConfig({
  plugins: [react()],
  build: {
    /**
     * Source maps in the production build.
     *
     * Without them a crash reports `gf@index-C1OJYrJR.js:197:108279`, which
     * names nothing and cannot be acted on — the one time you need a stack is
     * the one time it is unreadable. With them the same frame reads as a file,
     * a component and a line.
     *
     * `.map` files are emitted alongside the bundle and fetched only when a
     * developer opens the debugger, so visitors never download them. They do
     * expose the original source to anyone who looks; that is already true of
     * any front-end bundle, which ships the same logic in minified form, and no
     * secret belongs in it either way.
     */
    sourcemap: true,
  },
  server: {
    port: 5173,
    proxy: {
      '/api': proxy,
      '/uploads': proxy,
      '/socket.io': { ...proxy, ws: true },
    },
  },
})
