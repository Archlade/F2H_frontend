import axios from 'axios'

/**
 * Where the API lives.
 *
 * Read from the build environment rather than hardcoded — this was
 * `http://localhost:5000/api`, which meant the deployed site asked the
 * *visitor's own machine* for data and every page failed for everyone but a
 * developer running Flask locally.
 *
 * Set in `.env.production` (committed) and overridable per build:
 *   VITE_API_URL=https://api.f2hmarket.com
 *
 * The trailing `/api` is appended here, so the variable is the origin only —
 * `https://api.f2hmarket.com`, no trailing slash. Any slash is stripped anyway,
 * because `…com//api` 404s on some nginx configurations and that is a
 * miserable thing to debug.
 */
// Empty in development (see .env.development): an empty origin yields relative
// URLs, which Vite proxies to Flask — same-origin, so the auth cookie is sent
// and there is no CORS preflight. Absolute in production, where the site and
// the API are genuinely different hosts.
//
// `?? ''` rather than `|| 'somewhere'`: an empty value is a deliberate choice,
// and a `||` fallback would silently override it with a production URL and
// break local development in a way that looks like a server problem.
const API_ORIGIN = (import.meta.env.VITE_API_URL ?? '').replace(/\/+$/, '')

export const API_BASE_URL = `${API_ORIGIN}/api`
/** Origin without the /api prefix — Socket.IO and upload URLs need this. */
export const API_ORIGIN_URL = API_ORIGIN

const api = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: true,
  headers: { 'Content-Type': 'application/json' },
})

// The JWT lives in an httpOnly cookie, so flask-jwt-extended requires the
// double-submit CSRF token on every state-changing request.
const CSRF_METHODS = ['post', 'put', 'patch', 'delete']

function getCookie(name) {
  const match = document.cookie.match(new RegExp('(^|;\\s*)' + name + '=([^;]*)'))
  return match ? decodeURIComponent(match[2]) : null
}

const REFRESH_PATH = '/auth/refresh'

api.interceptors.request.use((config) => {
  if (CSRF_METHODS.includes((config.method || 'get').toLowerCase())) {
    // The refresh endpoint is guarded by the refresh token's own CSRF cookie,
    // not the access token's. Sending the wrong one fails the double-submit
    // check and looks exactly like an expired session.
    const csrf = config.url === REFRESH_PATH
      ? getCookie('csrf_refresh_token')
      : getCookie('csrf_access_token')
    if (csrf) config.headers.set('X-CSRF-TOKEN', csrf)
  }
  // Let the browser set the multipart boundary itself.
  if (config.data instanceof FormData) {
    config.headers.delete('Content-Type')
  }
  return config
})

/**
 * One in-flight refresh, shared by every request that got a 401.
 *
 * Without this, a page that fires six requests on mount gets six 401s and sends
 * six refreshes. They race, and the last response to arrive overwrites the
 * cookie the others already used — some requests then retry with a token that
 * has been replaced. Every caller awaits the same promise instead.
 */
let refreshing = null

function refreshSession() {
  if (!refreshing) {
    refreshing = api.post(REFRESH_PATH).finally(() => { refreshing = null })
  }
  return refreshing
}

api.interceptors.response.use(
  (res) => res,
  async (error) => {
    const { response, config } = error
    if (response?.status !== 401 || !config) return Promise.reject(error)

    const code = response.data?.code
    // CSRF_ERROR means the session is still valid — don't sign the user out.
    const expired = code === 'TOKEN_EXPIRED' || code === 'TOKEN_MISSING' || code === 'TOKEN_INVALID'
    if (!expired) return Promise.reject(error)

    // A 401 from the refresh endpoint itself is the end of the road: the
    // refresh token is gone, expired, or invalidated by a password change.
    // Retrying it would loop forever.
    if (config.url === REFRESH_PATH || config._retried) {
      window.dispatchEvent(new CustomEvent('auth:expired'))
      return Promise.reject(error)
    }

    try {
      await refreshSession()
    } catch {
      window.dispatchEvent(new CustomEvent('auth:expired'))
      return Promise.reject(error)
    }

    // Replay the original request once, now that the access cookie is fresh.
    config._retried = true
    return api(config)
  }
)

export default api

// List endpoints return either a bare array or a paginated { items, total, ... }
// envelope. Normalise so callers can always treat the result as an array.
export const toList = (data) => (Array.isArray(data) ? data : data?.items || [])

// ─── Auth ───────────────────────────────────────────────────
export const authAPI = {
  register: (data) => api.post('/auth/register', data),
  login: (data) => api.post('/auth/login', data),
  logout: () => api.post('/auth/logout'),
  // Rarely called directly — the response interceptor drives this on a 401.
  // Exposed so an explicit "keep me signed in" check can use it too.
  refresh: () => api.post(REFRESH_PATH),
  // Upgrades the signed-in customer to a farmer account in place, keeping
  // their orders, addresses and chats.
  becomeFarmer: (data) => api.post('/auth/become-farmer', data),
  me: () => api.get('/auth/me'),
  updateProfile: (data) => api.put('/auth/me', data),
  changePassword: (data) => api.post('/auth/change-password', data),

  // Account deletion. Required by Google Play for any app offering account
  // creation, and offered on the website for the same reason — the policy asks
  // for a publicly reachable route as well as an in-app one.
  //
  // The GET reports whether deletion is possible and what is in the way, so the
  // form can warn somebody mid-delivery before they type their password.
  deleteAccountStatus: () => api.get('/auth/delete-account'),
  deleteAccount: (data) => api.post('/auth/delete-account', data),
  forgotPassword: (email) => api.post('/auth/forgot-password', { email }),
  verifyResetToken: (token) => api.get('/auth/reset-password/verify', { params: { token } }),
  resetPassword: (token, newPassword) =>
    api.post('/auth/reset-password', { token, new_password: newPassword }),
}

// ─── Products ───────────────────────────────────────────────
export const productsAPI = {
  list: (params) => api.get('/products', { params }),
  get: (id) => api.get(`/products/${id}`),
  create: (data) => api.post('/products', data),
  update: (id, data) => api.put(`/products/${id}`, data),
  delete: (id) => api.delete(`/products/${id}`),
  addDiscount: (id, data) => api.post(`/products/${id}/discount`, data),
  removeDiscount: (id) => api.delete(`/products/${id}/discount`),
}

// ─── Farmers ────────────────────────────────────────────────
export const farmersAPI = {
  list: (params) => api.get('/farmers', { params }),
  get: (id) => api.get(`/farmers/${id}`),
  updateProfile: (data) => api.put('/farmers/profile', data),
  getDashboardStats: () => api.get('/farmers/dashboard/stats'),
  // Real series for the charts: six months of orders and revenue, plus the
  // farmer's best sellers. The analytics page rendered hardcoded numbers before
  // this existed.
  getDashboardAnalytics: () => api.get('/farmers/dashboard/analytics'),
}

// ─── Requests ────────────────────────────────────────────────
export const requestsAPI = {
  create: (data) => api.post('/requests', data),
  list: (params) => api.get('/requests', { params }),
  get: (id) => api.get(`/requests/${id}`),
  updateStatus: (id, data) => api.patch(`/requests/${id}/status`, data),
}

// ─── Notifications ───────────────────────────────────────────
export const notificationsAPI = {
  list: (params) => api.get('/notifications', { params }),
  unreadCount: () => api.get('/notifications/unread-count'),
  markRead: (id) => api.patch(`/notifications/${id}/read`),
  markAllRead: () => api.patch('/notifications/read-all'),
}

// ─── Categories ──────────────────────────────────────────────
/**
 * What customers think of F2H itself.
 *
 * `list` is public — it is the homepage testimonials, and the server returns
 * approved reviews only. There is no parameter that asks for the pending ones.
 */
export const serviceReviewsAPI = {
  list: (params) => api.get('/service-reviews', { params }),
  mine: () => api.get('/service-reviews/mine'),
  // Creates or replaces — one opinion of the service per person, and editing
  // sends it back to the approval queue.
  submit: (data) => api.post('/service-reviews', data),
  withdraw: () => api.delete('/service-reviews/mine'),
}

export const categoriesAPI = {
  list: () => api.get('/categories'),
}

// ─── Locations ───────────────────────────────────────────────
export const locationsAPI = {
  list: () => api.get('/locations'),
  add: (data) => api.post('/locations', data),
  update: (id, data) => api.put(`/locations/${id}`, data),
  delete: (id) => api.delete(`/locations/${id}`),
  getAddresses: () => api.get('/locations/addresses'),
  addAddress: (data) => api.post('/locations/addresses', data),
  updateAddress: (id, data) => api.put(`/locations/addresses/${id}`, data),
  deleteAddress: (id) => api.delete(`/locations/addresses/${id}`),
}

// ─── Favorites ───────────────────────────────────────────────
export const favoritesAPI = {
  list: (params) => api.get('/favorites', { params }),
  toggleProduct: (id) => api.post(`/favorites/product/${id}`),
  toggleFarmer: (id) => api.post(`/favorites/farmer/${id}`),
  check: (params) => api.get('/favorites/check', { params }),
}

// ─── Reviews ─────────────────────────────────────────────────
export const reviewsAPI = {
  list: (params) => api.get('/reviews', { params }),
  create: (data) => api.post('/reviews', data),
  // The app has always been able to do this; the website could not, so a
  // review written on a phone could only be removed from that phone.
  delete: (id) => api.delete(`/reviews/${id}`),
}

// ─── Uploads ─────────────────────────────────────────────────
export const uploadsAPI = {
  uploadImage: (file, type = 'misc') => {
    const form = new FormData()
    form.append('file', file)
    form.append('type', type)
    return api.post('/uploads/image', form)
  },
}

// ─── Coupons ─────────────────────────────────────────────────
export const couponsAPI = {
  // Checks a code against an order total. Claims nothing — the coupon is only
  // consumed when the order is created, which is where two people racing for
  // the same code is settled. An invalid code comes back as 200 with
  // { valid: false, error }, not as a rejected promise.
  preview: (code, subtotal) => api.post('/coupons/preview', { code, subtotal }),
  myRedemptions: () => api.get('/coupons/my-redemptions'),
}

// ─── Homepage ────────────────────────────────────────────────
export const homepageAPI = {
  get: () => api.get('/homepage'),
}

// ─── Promotional banners ─────────────────────────────────────
// `list` is the public feed — only what is live right now, since the schedule
// is applied in SQL. The admin calls return every banner regardless of state,
// plus the schedule and the counters.
export const bannersAPI = {
  list: () => api.get('/banners'),
  recordImpression: (id) => api.post(`/banners/${id}/impression`),
  recordClick: (id) => api.post(`/banners/${id}/click`),

  adminList: () => api.get('/banners/admin'),
  create: (data) => api.post('/banners/admin', data),
  update: (id, data) => api.put(`/banners/admin/${id}`, data),
  remove: (id) => api.delete(`/banners/admin/${id}`),
  // Position in the array is the order, so the caller sends what the admin
  // sees after a reorder rather than computing sort_order values.
  reorder: (bannerIds) => api.put('/banners/admin/reorder', { banner_ids: bannerIds }),
}

// ─── Customers ───────────────────────────────────────────────
export const customersAPI = {
  dashboard: () => api.get('/customers/dashboard'),
  // No `profile` here. There was one, pointing at `/customers/profile`, which
  // the backend has never served — `customers_bp` registers `/dashboard` and
  // nothing else. Nothing called it, so it never 404'd in front of anyone; it
  // just sat here looking like an endpoint that existed. The customer's own
  // details come from `authAPI.me`.
}

// ─── Admin ───────────────────────────────────────────────────
export const adminAPI = {
  dashboard: () => api.get('/admin/dashboard'),
  analytics: () => api.get('/admin/analytics'),
  users: (params) => api.get('/admin/users', { params }),
  getUser: (id) => api.get(`/admin/users/${id}`),
  toggleUser: (id) => api.patch(`/admin/users/${id}/activate`),
  farmers: (params) => api.get('/admin/farmers', { params }),
  verifyFarmer: (id) => api.patch(`/admin/farmers/${id}/verify`),
  suspendFarmer: (id) => api.patch(`/admin/farmers/${id}/suspend`),
  products: (params) => api.get('/admin/products', { params }),
  approveProduct: (id) => api.patch(`/admin/products/${id}/approve`),
  // Toggles whether a product may be put in a weekly basket. Removing is not
  // inert: the response reports `baskets_affected` and `baskets_paused`,
  // because taking a product off the list edits every live basket holding it.
  toggleBasketProduct: (id) => api.patch(`/admin/products/${id}/basket`),
  featureProduct: (id) => api.patch(`/admin/products/${id}/feature`),
  getFeaturedFarmers: () => api.get('/admin/featured-farmers'),
  setFeaturedFarmers: (data) => api.put('/admin/featured-farmers', data),
  getFeaturedProducts: () => api.get('/admin/featured-products'),
  setFeaturedProducts: (data) => api.put('/admin/featured-products', data),
  getHomepageContent: () => api.get('/admin/homepage-content'),
  updateHomepageSection: (key, data) => api.put(`/admin/homepage-content/${key}`, data),
  reports: (params) => api.get('/admin/reports', { params }),
  updateReport: (id, data) => api.patch(`/admin/reports/${id}`, data),
  requests: (params) => api.get('/admin/requests', { params }),
  auditLogs: (params) => api.get('/admin/audit-logs', { params }),

  // Figures an admin can change without a deploy. `min_order_value: null`
  // clears the customisation and hands the figure back to the server's
  // configured default — it is not the same as omitting the key, which leaves
  // the setting alone.
  settings: () => api.get('/admin/settings'),
  updateSettings: (data) => api.patch('/admin/settings', data),

  // A report spreadsheet — `farmer-stock` or `basket-orders`.
  //
  // `responseType: 'blob'` is required. Without it axios parses the body as
  // text and the .xlsx arrives corrupted, because a zip container does not
  // survive being decoded as UTF-8.
  report: (slug) =>
    api.get(`/admin/reports/${slug}.xlsx`, { responseType: 'blob' }),

  // The same rows the spreadsheet is built from, for rendering on screen.
  // `/data` on the end because `/admin/reports` already belongs to content
  // moderation — see the route's docstring.
  reportData: (slug) => api.get(`/admin/reports/${slug}/data`),

  // Rebuild and push to Google Drive now, rather than waiting for the schedule.
  // Distinct from `report` above: that gets a file onto *this* device, these
  // update the copy in Drive that everyone else is looking at.
  publishReports: () => api.post('/admin/reports/publish'),
  publishReport: (slug) => api.post(`/admin/reports/${slug}/publish`),

  // Sends a real push to your own registered devices and reports which link in
  // the chain is broken. Resolves rather than rejects when push is broken — the
  // failure is the answer, so it comes back in the body with a verdict.
  pushSelfTest: () => api.post('/admin/push/self-test'),

  // ── Delivery partners ──────────────────────────────────────────────────
  // Accounts are created here rather than by signup: a delivery account can
  // read customers' addresses and phone numbers, which is not a power to hand
  // out on a public form.
  deliveryPartners: () => api.get('/admin/delivery-partners'),
  createDeliveryPartner: (data) => api.post('/admin/delivery-partners', data),

  // `kind` is 'request' or 'basket' — the two order types live in different
  // tables and the orders screen lists them together. A null deliveryId
  // unassigns, which is how an order moves between partners.
  assignDelivery: (kind, orderId, deliveryId) =>
    api.patch(`/admin/orders/${kind}/${orderId}/assign`, { delivery_id: deliveryId }),

  // ── Service reviews ────────────────────────────────────────────────────
  // Feedback about F2H itself, as opposed to `reviews` below, which moderates
  // what customers said about a *product*. This one decides what appears on
  // the homepage.
  serviceReviews: (params) => api.get('/admin/service-reviews', { params }),
  approveServiceReview: (id) => api.patch(`/admin/service-reviews/${id}/approve`),
  deleteServiceReview: (id) => api.delete(`/admin/service-reviews/${id}`),

  // ── Weekly basket items ────────────────────────────────────────────────
  // Items F2H sells inside a basket, created here rather than listed by a
  // farm. They are ordinary products with basket_eligible + basket_only set,
  // owned by the platform seller account — so they are hidden from the
  // marketplace, refused for one-off orders, and exempt from stock checks.
  basketItems: () => api.get('/admin/basket-items'),
  createBasketItem: (data) => api.post('/admin/basket-items', data),
  updateBasketItem: (id, data) => api.patch(`/admin/basket-items/${id}`, data),
  retireBasketItem: (id) => api.delete(`/admin/basket-items/${id}`),

  // Collected is derived from completed orders; only handovers are stored.
  // Outstanding is the subtraction, so the two cannot drift apart.
  deliveryCash: () => api.get('/admin/delivery-cash'),
  remittances: (id) => api.get(`/admin/delivery-cash/${id}/remittances`),
  recordRemittance: (id, data) =>
    api.post(`/admin/delivery-cash/${id}/remittances`, data),
  reviews: (params) => api.get('/admin/reviews', { params }),
  approveReview: (id) => api.patch(`/admin/reviews/${id}/approve`),
  createAnnouncement: (data) => api.post('/admin/announcements', data),
  getAnnouncements: () => api.get('/admin/announcements'),
  createCategory: (data) => api.post('/admin/categories', data),
  familyPackOrders: (params) => api.get('/admin/family-pack-orders', { params }),

  // Every order in the platform, both kinds, merged and newest first.
  //
  // Carries each side's phone number and a Google Maps link — admin-only, and
  // not returned by any customer-facing endpoint.
  orders: (params) => api.get('/admin/orders', { params }),

  // Weekly baskets, with per-status counts alongside the page.
  familyPackSubscriptions: (params) => api.get('/admin/family-pack-subscriptions', { params }),

  // Coupons. The list response carries a `summary` alongside `items`, so the
  // header counts render without a second request.
  coupons: (params) => api.get('/admin/coupons', { params }),
  createCoupon: (data) => api.post('/admin/coupons', data),
  updateCoupon: (id, data) => api.put(`/admin/coupons/${id}`, data),
  deleteCoupon: (id) => api.delete(`/admin/coupons/${id}`),
  couponRedemptions: (params) => api.get('/admin/coupon-redemptions', { params }),
}

// ─── Family Pack Subscriptions (weekly baskets) ──────────────
export const familyPackSubscriptionsAPI = {
  list: (params) => api.get('/family-pack-subscriptions', { params }),
  get: (id) => api.get(`/family-pack-subscriptions/${id}`),
  create: (data) => api.post('/family-pack-subscriptions', data),
  update: (id, data) => api.put(`/family-pack-subscriptions/${id}`, data),
  setStatus: (id, data) => api.patch(`/family-pack-subscriptions/${id}/status`, data),
  runDue: () => api.post('/family-pack-subscriptions/run-due'),
}

// ─── Family Pack Orders ──────────────────────────────────────
export const familyPackOrdersAPI = {
  create: (data) => api.post('/family-pack-orders', data),
  list: (params) => api.get('/family-pack-orders', { params }),
  get: (id) => api.get(`/family-pack-orders/${id}`),
  updateStatus: (id, data) => api.patch(`/family-pack-orders/${id}/status`, data),
}

// ─── Cart ────────────────────────────────────────────────────
//
// Server-side, so the same cart follows the customer between phone and browser.
// Every response is the whole cart summary — items, subtotal, and how far it is
// from the ₹300 minimum — so a mutation never needs a follow-up GET.
export const cartAPI = {
  get: () => api.get('/cart'),
  addItem: (productId, quantity) =>
    api.post('/cart/items', { product_id: productId, quantity }),
  updateItem: (itemId, quantity) =>
    api.patch(`/cart/items/${itemId}`, { quantity }),
  removeItem: (itemId) => api.delete(`/cart/items/${itemId}`),
  clear: () => api.delete('/cart'),
  // Fans out into one order per line — an order is one product from one farmer.
  checkout: (data) => api.post('/cart/checkout', data),
}

// There is no payoutsAPI. Farmers are paid in cash at stock pickup, so there is
// no balance to hold, nothing to request and nothing to approve. What the
// farmer was handed rides on the order's payment row — see `farmer_paid_at` and
// `farmer_paid_amount` in the payment payload.

// ─── Payments (cash on delivery) ─────────────────────────────
//
// There is no checkout and no gateway: the customer pays cash to whoever brings
// the produce, and the farmer records it. `orderType` is 'request' for a
// purchase request or 'pack-order' for a family pack order — the two names the
// backend routes on.
export const paymentsAPI = {
  status: (orderType, orderId) => api.get(`/payments/status/${orderType}/${orderId}`),

  // Never sends an amount. The server charges what it froze when the order was
  // confirmed, so a tampered client cannot record a ₹500 order as ₹5 collected.
  //
  // Safe to retry — the server treats a second collection for the same order as
  // a no-op rather than crediting the farmer twice.
  collect: (orderType, orderId, note) =>
    api.post('/payments/collect', { order_type: orderType, order_id: orderId, note }),
}

